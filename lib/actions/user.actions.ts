"use server";

import { createAdminClient, createSessionClient } from "../appwrite";
import { ID } from "node-appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE: DATABASE_ID,
  APPWRITE_COLLECTION_USERS: USER_COLLECTION_ID,
  APPWRITE_COLLECTION_BANKS: USER_BANK_ID,
} = process.env;

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const res = await account.createEmailPasswordSession(email, password);

    return parseStringify(res);
  } catch (error) {
    console.log(error);
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  let newUserAccount;
  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      firstName + " " + lastName
    );

    if (!newUserAccount) throw new Error("Error creating user");

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });

    if (!dwollaCustomerUrl) throw new Error("Error creating dwolla customer");

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    );

    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.log(error);
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    cookies().delete("appwrite-session");

    await account.deleteSession("current");
  } catch (error) {
    return null;
  }
};

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id,
      },
      client_name: user.firstName + " " + user.lastName,
      products: ["auth"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };
    const res = await plaidClient.linkTokenCreate(tokenParams);
    return parseStringify({ linkToken: res.data.link_token });
  } catch (error) {
    console.log(error);
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();
    const bankAccount = database.createDocument(
      DATABASE_ID!,
      USER_BANK_ID!,
      ID.unique(),
      { userId, bankId, accountId, accessToken, fundingSourceUrl, sharableId }
    );

    return parseStringify(bankAccount);
  } catch (error) {
    console.error(error);
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const res = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = res.data.access_token;
    const itemID = res.data.item_id;

    const accountRes = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accessData = accountRes.data.accounts[0];

    const req: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accessData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenRes = await plaidClient.processorTokenCreate(req);
    const processorToken = processorTokenRes.data.processor_token;

    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accessData.name,
    });
    if (!fundingSourceUrl) throw Error;

    //Crate a bank acc
    await createBankAccount({
      userId: user.$id,
      bankId: itemID,
      accountId: accessData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accessData.account_id),
    });

    revalidatePath("/");
    return parseStringify({
      publicTokenExchange: "Complete",
    });
  } catch (error) {
    console.error(error);
  }
};
