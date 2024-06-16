import './App.css';
import React, { useState } from 'react';
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/types.ts";

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);

function App() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [txt, setTxt] = useState<string | null>(null);
  
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    
    setLoading(true);
    setTxt(null);
    
    const { error } = await supabase.from("users").insert({ email });
    
    const errorMsg = error?.code === "23505" ? "We've already got this email, thank you!" : "Something went wrong, try again later."
    setTxt(error ? errorMsg : "You're all set, thank you!");
    setLoading(false);
  };
  
  
  return (
    <div className={"container"}>
      <div className={"video-placeholder"}>
        <video controls autoPlay muted>
          <source src={"/vid.mp4"} type="video/mp4"/>
          Your browser does not support the video tag.
        </video>
      </div>
      <div className={"text-container"}>
        <h1 className={"text-title"}>Peach Pod</h1>
        <p className={"text-subtitle"}>A new type of home device.<br/>Get on the waitlist for early access.</p>
        <form className={"email-container"} onSubmit={handleSubmit}>
          <input
            className={"email-input"}
            placeholder={"Email Address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            type={"email"}
          />
          <button className={"submit-btn"} type="submit" disabled={loading}>
            {loading ? <div className="loader"></div> : 'Submit'}
          </button>
        </form>
        <p className={"text-success"}>{txt}</p>
      </div>
    </div>
  );
}

export default App;
