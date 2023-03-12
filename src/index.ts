import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import dotenv from "dotenv";
import { exec } from "child_process";
import { stdin } from "process";

dotenv.config();

async function mainGit() {
  return new Promise((resolve, reject) => {
    exec('git checkout -b "feature_1"', (error, stdout) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout)
    })
  })
}

async function mainNotion() {
  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
  });

  const response = await notion.databases.query({
    database_id: process.env.BRANCHES_DB_ID ?? '',
  });
  // @ts-ignore
  console.log((response.results[0] as PageObjectResponse).properties.Name.title);
}

// mainNotion()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
//   });

mainGit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
