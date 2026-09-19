import {GoogleGenAI, Type} from "@google/genai"
import "dotenv/config"
import {exec} from "child_process"
import util from "util"
import os from "os"
import readlineSync from "readline-sync"

const platform=os.platform;//tells the platform 

// child_process → lets your Node.js program run commands on the computer's terminal.
// util → is a collection of helper utilities provided by Node.js
// promisify() =converts an old-style callback-based function into a Promise-based function, so you can use await.

const execute=util.promisify(exec);

const ai=new GoogleGenAI({
    apiKey:process.env.GEMINI_API_KEY
})

// creating the tool to execute the command in terminal
async function executeCommand({command}){
    try{
        const {stdout,stderr}=await execute(command)
        if(stderr){//something wrong in terminal while running the command
            return `error-${stderr}`
        }
        return `success:${stdout}`
    }
    catch(err){//the command was wrong given as parameter
        return `error- ${err}`
    }
}

//explaining the tool to llm
const commandexecuter={
    name:"executeCommand",
    description:"it takes any shell/terminal command and executes it.it will help to create,read,write,update,delete any folder or file",
    parameters:{
        type:Type.OBJECT,
        properties:{
            command:{
                type:Type.STRING,
                description:"it is the shell/terminal command. ex:mkdir calculator, New-Item calculator/file.txt  etc"
            }
        },
        required:["command"]
    }
}

let history=[];//contains all the history messages during a convo

async function buildWebsite(query){

    history.push({
        role:'user',
        parts:[{text:query}]
    });
    while(true){
    const result=await ai.models.generateContent({
        model:"gemini-3.5-flash",
        contents:history,
        config:{
            systemInstruction:`you are a website builder which will create frontend part of website using terminal .you will give shell/terminal command one by one and out tool will execute it.
            use best practice for commands.it should handle multiline write also correctly
            give the command according to operating system we are using which is ${platform}.
            your job-
            1.analyze the user query
            2.take the necessary action after analyzing the query by giving shell command according to the user operating system
            step by step guid:
            1.first you have to create the folder for the website which we have to creaate, ex:mkdir calculator
            2.give command to create html file ex:New-Item calculator/index.html
            3.give command to create css file
            4.give command to create javascript file
            5.give command to write in html file
            6.give command to write in css file
            7.give command to write in js file
            8.fix the error if they are present at any step by write,update
            `,

            tools:[
                {
                    functionDeclarations:[commandexecuter]
                }
            ]
        }
    })

    if(result.functionCalls && result.functionCalls.length>0){
        const functionCall=result.functionCalls[0];
        const {name,args} =functionCall;
        const toolResponse = executeCommand(args);//calling the tool

        const functionResponsePart={
            name:functionCall.name,
            response:{
                result:toolResponse
            }
        }
        // push the llm tool call in history
        history.push(result.candidates[0].content);

        // push the tool response in history

        history.push({
            role:"user",
            parts:[{
                functionResponse:functionResponsePart
            }]
        })

    }
    else{
        console.log(result.text);
        history.push({
            role:"model",
            parts:[{text:result.text}]
        })
    }
}

}

while(true){
    const question=readlineSync.question("what to build ?");
    if(question=="exit") break;
    
    await buildWebsite(question);
}