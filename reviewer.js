import fs from "fs"
import path from "path";
import {GoogleGenAI, Type} from "@google/genai"
import "dotenv/config"

// TOOLS
async function readFile({file_path}) {
    try{
        const content=fs.readFileSync(file_path,"utf-8");
        console.log(`reading ${file_path}`);
        return {content}
    }
    catch(e){
        console.log(`failed to read ${file_path}: ${err.message}`);
        return { error: err.message };
    }
}

async function writeFile({file_path,content}){
    try{
        fs.writeFileSync(file_path,content,"utf-8");
        console.log(`writing in :${file_path}`);
        return {success:true};
    }
    catch(e){
        console.log(`failed to write ${file_path}: ${err.message}`);
        return { success: false, error: err.message };
    }
}

async function listFiles({directory}){
    const files=[];
    const extensions=['.js','.jsx','.ts','.tsx','.html','.css'];
    scan(directory);

    function scan(dir){
        const items=fs.readdirSync(dir);
        for(const item of items){
            const fullPath=path.join(dir,item);
            // skip node_modules,dist,build,env
            if(fullPath.includes            ("node_modules")
                ||fullPath.includes("dist")
                ||fullPath.includes("build")
                ||fullPath.includes("env")) 
                continue;
            
            const stat=fs.statSync(fullPath)
            if(stat.isDirectory()){
                scan(fullPath)
            }
            else if(stat.isFile()){
                const ext=path.extname(item)
                if(extensions.includes(ext))
                    files.push(fullPath)
            }
        }
    }
    console.log(`found ${files.length} files`)
    return {files};
}
// describing tools to llm
const listFilesTool={
    name:"listFiles",
    description:"get all the files in a directory",
    parameters:{
        type:Type.OBJECT,
        properties:{
            directory:{
                type:Type.STRING,
                description:"directory path to scan"
            }
        },
        required:["directory"]
    }
}

const readFileTool={
    name:"readFile",
    description:"read a file content",
    parameters:{
        type:Type.OBJECT,
        properties:{
            file_path:{
                type:Type.STRING,
                description:"path to the file"
            }
        },
        required:["file_path"]
    }
}

const writeFileTool={
    name:"writeFile",
    description:"write fixed content back to file",
    parameters:{
        type:Type.OBJECT,
        properties:{
            file_path:{
                type:Type.STRING,
                description:"path to the file to overwrite"
            },
            content:{
                type:Type.STRING,
                description:"the corrected file content to write"
            }
        },
        required:["file_path","content"]
    }
}

const tools={
    "readFile":readFile,
    "writeFile":writeFile,
    "listFiles":listFiles
}

const ai=new GoogleGenAI({
    apiKey:process.env.GEMINI_API_KEY
})

// now the main function

export async function run(directoryPath){
    console.log(`reviewing :${directoryPath}\n`);

    const History=[{
        role:'user',
        parts:[{text:`review and fix all code in ${directoryPath}`}]
    }]
    while(true){
        const result=await ai.models.generateContent({
            model:"gemini-3.5-flash-lite",
            contents:History,
            config:{
                systemInstruction:`you are a code reviewer and fixer.
                your job:
                1.use list_files to get all files in directory
                2.use read_file to read all file content
                3.if there is any error, try to fix the code using the write_file function(write the corrected code back)
                `,
                tools:[{
                    functionDeclarations:[listFilesTool,readFileTool,writeFileTool]
                }]
            }
        })
        if(result.functionCalls && result.functionCalls.length>0){
            //push all function calls
            History.push(result.candidates[0].content);
            for(const functionCall of result.functionCalls){
                const {name,args}=functionCall;
                console.log(`calling ${name}`);
                const toolResponse=await tools[name](args);
                History.push({
                    role:"user",
                    parts:[{
                        functionResponse:{
                            name,
                            response:{result:toolResponse}
                        }
                    }]
                })
            }
        }
        else{
            console.log(result.text);
            break;
        }
    }
} 

const directory=process.argv[2]||'.'

await run(directory);