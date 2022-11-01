"use client";
import { useEffect, useState } from "react";

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

const flicker = async (setNew: Function) => {
    await sleep(500);
    setNew("_");
    await sleep(500);
    setNew("");
    await sleep(500);
    setNew("_");
    await sleep(500);
    setNew("");
}

const buildWord = async (setNew: Function, word: string) => {
    let current = "";
    for (let i = 0; i < word.length; i++){
        await sleep(250);
        current += word[i];
        setNew(current + "_");
    }
}

const deconstructWord = async (setNew: Function, word: string) => {
    let current = word + "_";
    while (current.length > 1) {
        current = current.substring(0, current.length - 2) + "_"
        setNew(current);
        await sleep(100);
    }
}

const animateWords = async (setNew: Function, words: string[]) => {
    for (let i = 0; i < words.length; i++){
        let sleeptime: number;
        if (i == 0){
            sleeptime = 0
        } else {
            sleeptime = (250 * words[i-1].length) + (100 * (words[i-1].length + 1))
        }
        await sleep(sleeptime);
        await buildWord(setNew, words[i]);
        await sleep(2000);
        if (i != words.length - 1){
            await deconstructWord(setNew, words[i]);
            flicker(setNew);
        }
    }
}

export default function Ticker(){
    const words = ["Your mom", "Steve Jobs", "NextJs", "databases", "etcetera", "CS wizard"];
    const [current, setNew] = useState("");

  useEffect(() => {
    flicker(setNew)
    .then(() => animateWords(setNew, words));

  }, []);

    return (
        <p>{current}</p>
    );
}