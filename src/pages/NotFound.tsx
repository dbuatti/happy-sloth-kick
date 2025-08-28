"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-red-600 dark:text-red-400">404</CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            Page Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 dark:text-gray-200">
            Oops! The page you are looking for does not exist. It might have been moved or deleted.
          </p>
          <Link to="/">
            <Button className="w-full">Go to Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;