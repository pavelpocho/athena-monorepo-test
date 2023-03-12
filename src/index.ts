import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import dotenv from "dotenv";
import { exec } from "child_process";
import { stdin } from "process";

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function createBranch() {
  const branchPagePropertyList = await getUncreatedBranches();
  const namesWithIds = branchPagePropertyList.map(a => ({
    id: a.id,
    name: a.properties.Name.title[0].plain_text,
    tags: a.properties.Tags
  }));
  if (namesWithIds.length == 0) {
    console.warn('No branches that haven\'t been created');
    return;
  }
  console.log('Found the following branches that haven\'t yet been created:');
  namesWithIds.map(n => n.name).forEach(n => console.log(n));
  const questions = [
    {
      type: 'list',
      name: 'branch',
      message: "Which one do you want to pick?",
      choices: namesWithIds.map(n => n.name)
    },
  ]
  const inquirer = await import("inquirer");
  const res = await inquirer.default.prompt(questions) as { branch: string };
  const pageT = namesWithIds.find(a => a.name == res.branch);
  if (pageT?.id != undefined && pageT?.tags != undefined) {
    await setBranchAsCreated(pageT.id);
    await checkoutBranch(res.branch);
  }
}

async function checkoutBranch(name: string) {
  return new Promise((resolve, reject) => {
    exec(`git checkout -b "${name}"`, (error, stdout) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout)
    })
  })
}

async function getCurrentBranch() {
  return new Promise<string>((resolve, reject) => {
    exec('git branch --show-current', (error, stdout) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout)
    })
  });
}

async function createCommit() {
  const branchName = await getCurrentBranch();
  const tasks = await getBranchTasks(branchName);

  const questions1 = [
    {
      type: 'confirm',
      name: 'completes',
      message: 'Does this commit complete a task?',
      default: false
    }
  ]
  const inquirer = await import("inquirer");
  const res1 = await inquirer.default.prompt(questions1) as { branch: string };
  console.log(res1);

  // @ts-ignore
  if (res1.completes) {
    const questions2 = [
      {
        type: 'list',
        name: 'task',
        message: "Which task does this commit complete?",
        choices: tasks.map(t => ({
          name: t.name,
          value: t.id
        }))
      },
    ]
  
    const res2 = await inquirer.default.prompt(questions2) as { branch: string };
    console.log(res2);
    // @ts-ignore
    await setTaskAsComplete(res2.task);
    await gitAddAll();
    const remoteExists = await doesRemoteBranchExist(branchName);
    // @ts-ignore
    await gitCommit(tasks.find(t => t.id == res2.task).name ?? '');
    await gitPush(remoteExists, branchName);

  }
  else {
    const questions2 = [
      {
        type: 'input',
        name: 'message',
        message: "Please enter a commit message."
      },
    ]
  
    const res2 = await inquirer.default.prompt(questions2) as { branch: string };
    console.log(res2);
    await gitAddAll();
    const remoteExists = await doesRemoteBranchExist(branchName);
    // @ts-ignore
    await gitCommit(res2.message);
    await gitPush(remoteExists, branchName);
  }

}

async function gitAddAll() {
  return new Promise((resolve, reject) => {
    exec('git add .', (error, stdout) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout)
    })
  })
}

async function gitCommit(message: string) {
  return new Promise((resolve, reject) => {
    exec(`git commit -m "${message}"`, (error, stdout) => {
      if (error) {
        console.log('Commit failed: ', error);
        resolve(error);
      }
      console.log('Commited.', stdout);
      resolve(stdout);
    })
  })
}

async function doesRemoteBranchExist(branchName: string) {
  return new Promise<boolean>((resolve, reject) => {
    exec(`git ls-remote --exit-code --heads origin ${branchName}`, (error, stdout) => {
      resolve(!(error || stdout == ''));
    })
  })
}

async function gitPush(remoteExists: boolean, branchName: string) {
  // Should tests be run here?
  return new Promise((resolve, reject) => {
    if (remoteExists) {
      exec('git push', (error, stdout) => {
        if (error) {
          console.log('Push failed: ', error);
          resolve(error);
        }
        console.log('Pushed.', stdout);
        resolve(stdout);
      })
    }
    else {
      exec(`git push -u origin ${branchName}`, (error, stdout) => {
        if (error) {
          console.log('Push failed: ', error);
          resolve(error);
        }
        console.log('Pushed.', stdout);
        resolve(stdout);
      })
    }
  })
}

type TagsObject = {
  id: string,
  type: string,
  select: {
    name: string
  }
};

type BranchProperties = {
  id: string,
  properties: {
    Tags: TagsObject
    Name: {
      id: string,
      type: string,
      title: [{
        plain_text: string
      }]
    },
    Tasks: [{
      id: string,
      relation: [{
        id: string
      }]
    }]
  }
}

type TaskProperties = {
  id: string,
  properties: {
    Name: {
      id: string,
      type: string,
      title: [{
        plain_text: string
      }]
    }
  }
}

async function setBranchAsCreated(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Tags: {
        select: {
          id: 'fa613f94-5cb1-4365-bc77-d621506e3afa'
        }
      }
    }
  })
}

async function getUncreatedBranches() {
  const response = await notion.databases.query({
    database_id: process.env.BRANCHES_DB_ID ?? '',
    filter: {
      property: 'Tags',
      select: {
        equals: 'No Branch'
      }
    }
  });
  const res = response.results.map(a => ({
    id: a.id,
    // @ts-ignore
    properties: a.properties,

  })) as BranchProperties[];
  return res;
}

async function getBranchTasks(branchName: string) {
  const response = await notion.databases.query({
    database_id: process.env.BRANCHES_DB_ID ?? '',
    filter: {
      property: 'Name',
      title: {
        equals: branchName
      }
    }
  });
  const res = response.results.map(a => ({
    id: a.id,
    // @ts-ignore
    properties: a.properties,

  })) as BranchProperties[];
  if (res.length == 0 || res.length > 1) {
    throw('No branch or more than one branch!');
  }
  const branchId = res[0].id;
  const taskResponse = await notion.databases.query({
    database_id: process.env.TASKS_DB_ID ?? '',
    filter: {
      property: 'Branch',
      relation: {
        contains: branchId
      }
    }
  });
  const taskRes = taskResponse.results.map(a => ({
    id: a.id,
    // @ts-ignore
    properties: a.properties,

  })) as TaskProperties[];
  return taskRes.map(a => ({
    id: a.id,
    name: a.properties.Name.title[0].plain_text
  }));
}

async function setTaskAsComplete(taskPageId: string) {
  await notion.pages.update({
    page_id: taskPageId,
    properties: {
      Status: {
        status: {
          id: '40a6a895-b297-4abf-ab7c-930620b720c6' // means 'Done', see below
        }
      }
    }
  });
}

createBranch()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
});

// createCommit()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
// });


// Getting tag ids

// async function test() {
//   const db = await notion.databases.retrieve({
//     database_id: process.env.BRANCHES_DB_ID ?? ''
//   });
//   // @ts-ignore
//   console.log(db.properties.Tags.select);
// }


// test()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
// });


// Getting task status ids

// They are:
// Not started: adc51459-4fed-4fb9-b51c-fa824d5d6a75
// In progress: c36b3bf1-2229-4ea6-9184-dd8657b5d6b5
// Done: 40a6a895-b297-4abf-ab7c-930620b720c6

// async function test() {
//   const db = await notion.databases.retrieve({
//     database_id: process.env.TASKS_DB_ID ?? ''
//   });
//   // @ts-ignore
//   console.log(db.properties.Status.status.options);
// }


// test()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
// });


