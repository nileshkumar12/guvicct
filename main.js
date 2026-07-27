// fs: file system

const fs = require("fs");

fs.readFile("./data.txt", "utf-8",  (err,data)=>{

    if(err){

        console.log("Error read file", err);
        return;

    }

    console.log(data);
})

//read data from file

