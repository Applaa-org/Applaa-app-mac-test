import { getGithubUser } from "../handlers/github_handlers";

export async function getGitAuthor() {
  const user = await getGithubUser();
  const author = user
    ? {
        name: `[applaa]`,
        email: user.email,
      }
    : {
        name: "[applaa]",
        email: "git@applaa.sh",
      };
  return author;
}
