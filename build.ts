import { project } from "worklift";
import { CopyTask, DeleteTask } from "worklift";

const app = project("testapp");

const clean = app.target("clean").tasks([
  DeleteTask.paths("dist"),
]);

const build = app.target("build").tasks([
  CopyTask.from("src").to("dist"),
]);
