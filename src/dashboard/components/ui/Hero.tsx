"use client";

import React from "react";
import { CloudShader } from "./cloud-shader";

export type HeroProps = {
  title?: string;
  subtitle?: string;
};

export function Hero({
  title = "Automate agent payments, effortlessly",
  subtitle = "Build, approve, and track transactions with a policy engine designed for autonomous agents.",
}: HeroProps) {
  return (
    <CloudShader
      className="h-screen w-full"
      speed={1}
      count={6}
      cloudColor="#fbf8f2"
      skyTopColor="#3876ba"
      skyBottomColor="#8cbfe8"
    >
      <div className="flex flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="max-w-3xl text-4xl font-bold text-white drop-shadow-md sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg text-white/90 drop-shadow sm:text-xl">
          {subtitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-white/90">
            Get Started
          </button>
          <button className="rounded-full border border-white/70 px-6 py-3 font-medium text-white transition hover:bg-white/10">
            Learn More
          </button>
        </div>
      </div>
    </CloudShader>
  );
}

export default Hero;
