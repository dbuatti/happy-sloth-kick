"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser"; // Updated import path

const WelcomeCard = () => {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    console.log("Input value:", inputValue);
    setInputValue("");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Welcome, {user?.email || "Guest"}!</CardTitle>
        <CardDescription className="text-center">
          This is a bare-bones application. Start building your features!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Enter something..."
          value={inputValue}
          onChange={handleInputChange}
        />
        <Button onClick={handleSubmit} className="w-full">
          Submit
        </Button>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;