// Test GH token: process.env.GH_TOKEN

async function createPR() {
  console.log('other branch');
}

createPR()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
});

// Run tests??
// Create PR using octokit
// Put in commit names from branch in Notion, which tasks have & haven't been completed, any custom user comment
// Update branch & task status in Notion - done tasks should be changed to "PR to dev", rest left be
// Keep in mind branch status is just a rollup of the status of its tasks since not all have to be completed for a PR
// GH Action tests & checks??
// Then it's a problem of release & GitHub actions for that...