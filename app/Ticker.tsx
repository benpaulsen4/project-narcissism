"use client";
import { JetBrains_Mono } from "next/font/google";
import { useEffect, useState } from "react";

const JBmono = JetBrains_Mono({ weight: "400", subsets: ["latin"] });

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const flicker = async (setNew: Function) => {
  await sleep(500);
  setNew("_");
  await sleep(500);
  setNew("");
  await sleep(500);
  setNew("_");
  await sleep(500);
  setNew("");
};

const builtflicker = async (setNew: Function, word: string) => {
  let current = word + "_";
  let alt = current.substring(0, current.length - 1);
  setNew(alt);
  await sleep(500);
  setNew(current);
  await sleep(500);
  setNew(alt);
  await sleep(500);
  setNew(current);
  await sleep(500);
  setNew(alt);
  await sleep(500);
  setNew(current);
  await sleep(500);
};

const buildWord = async (setNew: Function, word: string) => {
  let current = "";
  for (let i = 0; i < word.length; i++) {
    await sleep(200);
    current += word[i];
    setNew(current + "_");
  }
};

const deconstructWord = async (setNew: Function, word: string) => {
  let current = word + "_";
  while (current.length > 1) {
    current = current.substring(0, current.length - 2) + "_";
    setNew(current);
    await sleep(100);
  }
};

const animateWords = async (setNew: Function, words: string[]) => {
  for (let i = 0; i < words.length; i++) {
    let sleeptime: number;
    if (i == 0) {
      sleeptime = 0;
    } else {
      sleeptime = 2000;
    }
    await sleep(sleeptime);
    await buildWord(setNew, words[i]);
    await builtflicker(setNew, words[i]);
    if (i != words.length - 1) {
      await deconstructWord(setNew, words[i]);
      flicker(setNew);
    } else {
      while (true) {
        await builtflicker(setNew, words[i]);
      }
    }
  }
};

export default function Ticker() {
  const words = [
    "Web Developer",
    "Full-Stack Developer",
    "UI Designer",
    "Solutions Architect",
    "Quality Assurance Tester",
    "Digital Problem Solver",
  ];
  const [current, setNew] = useState("");

  useEffect(() => {
    flicker(setNew).then(() => animateWords(setNew, words));
  }, []);

  return (
    <div className="fix">
      <code className={JBmono.className}>{current}</code>
    </div>
  );
}
