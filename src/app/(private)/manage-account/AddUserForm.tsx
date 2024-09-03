// app/(private)/manage-account/AddUserForm.tsx
"use client";

import { useState } from "react";
import { addGithubUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AddUserForm() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addGithubUser(username);
    if (result.success) {
      setUsername("");
      setError("");
    } else {
      setError(result.error || "Failed to add user");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={addUser} className="mb-4">
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username"
          />
          <Button type="submit" className="mt-4">
            Add User
          </Button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}