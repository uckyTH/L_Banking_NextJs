"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import CustomInput from "./CustomInput";
import { authFormSchema } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getLoggedInUser, signIn, signUp } from "@/lib/actions/user.actions";
import PlaidLink from "./PlaidLink";

const AuthForm = ({ type }: AuthFormProps) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      if (type === "sign-up") {
        const userData = {
          firstName: data.firstName!,
          lastName: data.lastName!,
          address1: data.address1!,
          city: data.city!,
          state: data.state!,
          postalCode: data.postCode!,
          dateOfBirth: data.dateOfBirth!,
          ssn: data.ssn!,
          email: data.email,
          password: data.password,
        };
        const newUser = await signUp(userData);

        setUser(newUser);
      }
      if (type === "sign-in") {
        const res = await signIn({
          email: data.email,
          password: data.password,
        });

        if (res) router.push("/");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-form">
      <header className="flex flex-col gap-5 md:gap-8">
        <Link
          href={"/"}
          className="flex mb-4 cursor-pointer items-center gap-2"
        >
          <Image
            src={"/icons/logo.svg"}
            width={34}
            height={34}
            alt="LBank Logo"
          />
          <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">
            L Banking
          </h1>
        </Link>

        <div className="flex flex-col gap-1 md:gap-3">
          <h1 className="text-24 lg:text-36 font-semibold text-gray-900">
            {user ? "Link Account" : type === "sign-in" ? "Sign In" : "Sign up"}
          </h1>
          <p className="text-16 font-normal text-gray-600">
            {user
              ? "Link your account to get started"
              : "Please enter your details"}
          </p>
        </div>
      </header>
      {user ? (
        <div className="flex flex-col gap-4">
          {/* Plaid API */}
          <PlaidLink user={user} variant="primary" />
        </div>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {type === "sign-up" ? (
                <>
                  <div className="flex gap-4">
                    <CustomInput
                      control={form.control}
                      name={"firstName"}
                      label={"Firt Name"}
                      placeholder={"Enter your Firt Name"}
                    />
                    <CustomInput
                      control={form.control}
                      name={"lastName"}
                      label={"Last Name"}
                      placeholder={"Enter your Last Name"}
                    />
                  </div>
                  <CustomInput
                    control={form.control}
                    name={"address1"}
                    label={"Address"}
                    placeholder={"Enter your Address"}
                  />
                  <CustomInput
                    control={form.control}
                    name={"city"}
                    label={"City"}
                    placeholder={"Enter your City"}
                  />
                  <div className="flex gap-4">
                    <CustomInput
                      control={form.control}
                      name={"state"}
                      label={"State"}
                      placeholder={"Enter your State"}
                    />
                    <CustomInput
                      control={form.control}
                      name={"postCode"}
                      label={"Post Code"}
                      placeholder={"Enter your Post Code"}
                    />
                  </div>
                  <div className="flex gap-4">
                    <CustomInput
                      control={form.control}
                      name={"dateOfBirth"}
                      label={"Date of birth"}
                      placeholder={"DD/MM/YYYY"}
                    />
                    <CustomInput
                      control={form.control}
                      name={"ssn"}
                      label={"SSN"}
                      placeholder={"Enter your SSN"}
                    />
                  </div>
                </>
              ) : (
                <></>
              )}
              <CustomInput
                control={form.control}
                name={"email"}
                label={"Email"}
                placeholder={"Enter your Email"}
              />
              <CustomInput
                control={form.control}
                name={"password"}
                label={"Password"}
                placeholder={"Enter your password"}
              />
              <div className="flex flex-col gap-4">
                <Button type="submit" className="form-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> &nbsp;
                      Loading...
                    </>
                  ) : type === "sign-in" ? (
                    "Sign In"
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          <footer className="flex justify-center gap-1">
            <p className="text-14 text-gray-600 font-normal">
              {type === "sign-in"
                ? "Don't have an account?"
                : "Already have and account?"}
            </p>
            <Link href={type === "sign-in" ? "/sign-up" : "/sign-in"}>
              {type === "sign-in" ? "Sign up" : "Sign in"}
            </Link>
          </footer>
        </>
      )}
    </section>
  );
};

export default AuthForm;
