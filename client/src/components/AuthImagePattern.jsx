import React from 'react';

function AuthImagePattern({title, subtitle}) {
  return (
    <div
      className="flex flex-col justify-center items-center p-6 sm:p-12 max-w-md"
    >
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`w-20 h-20 rounded-2xl bg-primary/10 ${
              i % 2 === 0 ? "animate-pulse" : ""
            }`}
          />
        ))}
      </div>
      <h2
        className="text-2xl font-bold mb-4 text-center animate-fade-in duration-500 delay-100"
      >
        {title}
      </h2>
      <p
        className="text-lg text-base-content/60 text-center animate-fade-in duration-500 delay-200"
      >
        {subtitle}
      </p>
    </div>
  );
}

export default AuthImagePattern;