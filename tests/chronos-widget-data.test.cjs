"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {snapshot}=require("../chronos-widget-data.js");

test("uses completed focus timer data, not scheduled routine sessions",()=>{
 const result=snapshot({
  sessions:[{id:"class-secret",title:"Routine session"}],
  tasks:[{id:"task-private-id",title:"Learn DSA",done:true,notes:"private"}],
  subjects:[{name:"Private course"}]
 },{completed:7,totalMinutes:175});
 assert.deepEqual(result,{tasks:[{id:"study-1",text:"Learn DSA",done:true}],stats:{sessions:7,focusSeconds:10500}});
 assert.equal(JSON.stringify(result).includes("class-secret"),false);
 assert.equal(JSON.stringify(result).includes("private"),false);
 assert.equal(JSON.stringify(result).includes("Private course"),false);
});

test("defaults focus totals to zero when no focus timer state is available",()=>{
 const result=snapshot({sessions:Array.from({length:5},(_,i)=>({id:String(i)})),tasks:[]},null);
 assert.deepEqual(result,{tasks:[],stats:{sessions:0,focusSeconds:0}});
});

test("limits task payload and strips empty titles, original IDs and unrelated fields",()=>{
 const tasks=Array.from({length:80},(_,i)=>({id:"private-"+i,title:i===2?"  ":"Task "+i,done:i%2===0,notes:"secret"}));
 const result=snapshot({tasks},{completed:1,totalMinutes:1});
 assert.equal(result.tasks.length,59);
 assert.equal(result.tasks[0].id,"study-1");
 assert.equal(result.tasks[0].text,"Task 0");
 assert.equal(result.tasks.some(t=>t.id.startsWith("private-")),false);
 assert.equal(JSON.stringify(result).includes("secret"),false);
 assert.ok(result.tasks.every(t=>t.text.length<=100&&typeof t.done==="boolean"));
});

test("bounds invalid and excessive focus values",()=>{
 const result=snapshot({tasks:[]},{completed:-1,totalMinutes:20000000});
 assert.deepEqual(result.stats,{sessions:0,focusSeconds:100000000});
});
