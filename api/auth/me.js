"use strict";
const {handler}=require("../../lib/auth");
module.exports=(req,res)=>handler(req,res,"me");
