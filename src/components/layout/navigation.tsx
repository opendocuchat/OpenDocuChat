// components/layout/navigation.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "../ui/button";

export function Navigation() {
  const { data: session, status } = useSession();

  return (
    <div className="p-3 border-b flex justify-between items-center">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href="/" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Home
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/manage-index" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Search Index
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/manage-chatbot" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Chatbot
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/manage-account" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Account
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex items-center">
        {status === "authenticated" ? (
          <>
            <span className="mr-4">Signed in as {session.user?.name}</span>
            <Button variant="destructive" onClick={() => signOut()}>Sign Out</Button>
          </>
        ) : (
          <Link href="/signin" passHref>
            <Button onClick={() => window.location.href = "/signin"} variant="link">Sign In</Button>
          </Link>
        )}
      </div>
    </div>
  );
}