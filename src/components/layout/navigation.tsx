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
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex items-center">
        {status === "authenticated" ? (
          <>
            <span className="mr-4">Signed in as {session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/signin" passHref>
            <button className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}