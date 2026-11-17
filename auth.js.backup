
(function(){
"use strict";
const $=id=>document.getElementById(id);
const root=$("authRoot"),landing=$("landingView"),formView=$("authFormView"),form=$("authForm");
let mode="register";
function showAuth(view){
 if(view==="home"){landing.hidden=false;formView.hidden=true;return;}
 mode=view;landing.hidden=true;formView.hidden=false;
 const registering=mode==="register";
 $("authTitle").textContent=registering?"Create your account":"Welcome back";
 $("authSubtitle").textContent=registering?"Create an account to access LogicLab from any device.":"Log in with the account you registered on any device.";
 $("nameField").hidden=!registering;$("confirmField").hidden=!registering;
 $("authName").required=registering;$("authConfirm").required=registering;
 $("authPassword").autocomplete=registering?"new-password":"current-password";
 $("authSubmit").textContent=registering?"Create account":"Log in";
 $("authSwitch").innerHTML=registering?'Already registered? <button type="button" data-auth-view="login">Log in</button>':'New to LogicLab? <button type="button" data-auth-view="register">Create an account</button>';
 $("authError").textContent="";
}
function enterWorkspace(user){
 document.body.classList.add("authenticated");
 root.hidden=true;
 $("accountPill").textContent=user?.name?`Signed in as ${user.name}`:"Signed in";
 window.scrollTo(0,0);
}
async function request(path,options={}){
 const response=await fetch("/api/auth/"+path,{...options,credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})}});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok)throw new Error(data.error||"Request failed. Please try again.");
 return data;
}
document.addEventListener("click",e=>{
 const btn=e.target.closest("[data-auth-view]");
 if(btn){e.preventDefault();showAuth(btn.dataset.authView);}
});
$("authBack").addEventListener("click",()=>showAuth("home"));
form.addEventListener("submit",async e=>{
 e.preventDefault();const button=$("authSubmit"),error=$("authError");error.textContent="";
 const email=$("authEmail").value.trim(),password=$("authPassword").value;
 if(mode==="register"&&password!==$("authConfirm").value){error.textContent="Passwords do not match.";return;}
 button.disabled=true;button.textContent=mode==="register"?"Creating account…":"Logging in…";
 try{
  const data=await request(mode,{method:"POST",body:JSON.stringify({name:$("authName").value.trim(),email,password})});
  enterWorkspace(data.user);
 }catch(err){error.textContent=err.message;}
 finally{button.disabled=false;button.textContent=mode==="register"?"Create account":"Log in";}
});
$("logoutBtn").addEventListener("click",async()=>{
 try{await request("logout",{method:"POST",body:"{}"});}catch(e){console.error(e);}
 document.body.classList.remove("authenticated");root.hidden=false;showAuth("home");$("authForm").reset();$("accountPill").textContent="";
});
(async function restoreSession(){
 try{const data=await request("me",{method:"GET",headers:{}});if(data.authenticated)enterWorkspace(data.user);}
 catch(e){console.warn("Session check unavailable:",e.message);}
})();
})();
