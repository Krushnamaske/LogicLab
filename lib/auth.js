
"use strict";
const crypto=require("crypto");
const {MongoClient}=require("mongodb");
let clientPromise;
function getClient(){
 if(!process.env.MONGODB_URI) throw new Error("Database is not configured. Set MONGODB_URI.");
 if(!clientPromise){const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});clientPromise=client.connect();}
 return clientPromise;
}
async function collections(){
 const client=await getClient(), db=client.db(process.env.MONGODB_DB||"logiclab");
 await db.collection("sessions").createIndex({expiresAt:1},{expireAfterSeconds:0});
 await db.collection("users").createIndex({email:1},{unique:true});
 return {users:db.collection("users"),sessions:db.collection("sessions")};
}
function json(res,status,data,headers={}){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));res.end(JSON.stringify(data));}
function cookie(res,value,maxAge){
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 res.setHeader("Set-Cookie",`ll_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
function readCookie(req){const raw=req.headers.cookie||"";const part=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith("ll_session="));return part?part.slice(11):"";}
function readBody(req){return new Promise((resolve,reject)=>{let raw="";req.on("data",c=>{raw+=c;if(raw.length>12000){reject(new Error("Request too large"));req.destroy();}});req.on("end",()=>{try{resolve(JSON.parse(raw||"{}"));}catch{reject(new Error("Invalid request body"));}});req.on("error",reject);});}
function hashPassword(password,salt){return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,key)=>e?reject(e):resolve(key.toString("hex"))));}
async function passwordRecord(password){const salt=crypto.randomBytes(16).toString("hex");return {salt,hash:await hashPassword(password,salt)};}
async function verifyPassword(password,user){const hash=await hashPassword(password,user.salt);return crypto.timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(user.passwordHash,"hex"));}
async function createSession(sessions,userId,res){const token=crypto.randomBytes(32).toString("hex");const expiresAt=new Date(Date.now()+7*24*60*60*1000);await sessions.insertOne({tokenHash:crypto.createHash("sha256").update(token).digest("hex"),userId,expiresAt,createdAt:new Date()});cookie(res,token,604800);}
async function currentUser(req,users,sessions){const token=readCookie(req);if(!token)return null;const tokenHash=crypto.createHash("sha256").update(token).digest("hex");const session=await sessions.findOne({tokenHash,expiresAt:{$gt:new Date()}});if(!session)return null;return users.findOne({_id:session.userId},{projection:{name:1,email:1,createdAt:1}});}
async function handler(req,res,action){
 try{
  if(req.method==="OPTIONS"){res.statusCode=204;res.setHeader("Allow","GET, POST, OPTIONS");return res.end();}
  const {users,sessions}=await collections();
  if(action==="register"&&req.method==="POST"){
   const b=await readBody(req),name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
   if(name.length<2||name.length>80)return json(res,400,{error:"Enter your name (2–80 characters)."});
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json(res,400,{error:"Enter a valid email address."});
   if(password.length<8||password.length>128)return json(res,400,{error:"Password must contain 8–128 characters."});
   const record=await passwordRecord(password),doc={name,email,salt:record.salt,passwordHash:record.hash,createdAt:new Date()};
   try{const result=await users.insertOne(doc);await createSession(sessions,result.insertedId,res);return json(res,201,{ok:true,user:{name,email}});}catch(e){if(e.code===11000)return json(res,409,{error:"An account with this email already exists. Please log in."});throw e;}
  }
  if(action==="login"&&req.method==="POST"){
   const b=await readBody(req),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
   const user=await users.findOne({email});if(!user||!(await verifyPassword(password,user)))return json(res,401,{error:"Email or password is incorrect."});
   await createSession(sessions,user._id,res);return json(res,200,{ok:true,user:{name:user.name,email:user.email}});
  }
  if(action==="me"&&req.method==="GET"){
   const user=await currentUser(req,users,sessions);return json(res,200,{authenticated:!!user,user:user?{name:user.name,email:user.email}:null});
  }
  if(action==="logout"&&req.method==="POST"){
   const token=readCookie(req);if(token){const tokenHash=crypto.createHash("sha256").update(token).digest("hex");await sessions.deleteOne({tokenHash});}
   cookie(res,"",0);return json(res,200,{ok:true});
  }
  return json(res,405,{error:"Method not allowed."},{Allow:"GET, POST, OPTIONS"});
 }catch(e){console.error("LogicLab auth error:",e);return json(res,500,{error:"Something went wrong. Check the database configuration and try again."});}
}
module.exports={handler};
