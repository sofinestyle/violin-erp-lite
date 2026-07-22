import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const statusFiles = [
  "docs/00-governance/CURRENT_STATUS.md",
  "PROJECT.md",
  "ROADMAP.md",
  "README.md",
];

const fieldLabels = ["Current Phase", "Phase Status", "Current Task", "Current Task Status"];
const sectionIdentifierPattern = /\bTask\s+\d+\.\d+-[A-Z]\b/u;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readStatusField(content, label, file) {
  const pattern = new RegExp(`^- ${escapeRegExp(label)}：(.+)$`, "gmu");
  const matches = [...content.matchAll(pattern)];

  if (matches.length !== 1) {
    throw new Error(
      `${file} 必须且只能包含一个 “${label}” 状态字段，实际为 ${matches.length} 个。`,
    );
  }

  return matches[0][1].trim();
}

function readTaskStatus(content, task, file) {
  const pattern = new RegExp(`^- ${escapeRegExp(task)}：(.+)$`, "mu");
  const match = content.match(pattern);

  if (!match) {
    throw new Error(`${file} 缺少当前任务 ${task} 的正式状态。`);
  }

  return match[1].trim();
}

function readRoadmapPhaseStatus(content, phase) {
  const pattern = new RegExp(`^### ${escapeRegExp(phase)}：[^\n]+\n\n- 状态：(.+)$`, "mu");
  const match = content.match(pattern);

  if (!match) {
    throw new Error(`ROADMAP.md 缺少当前阶段 ${phase} 的正式状态。`);
  }

  return match[1].trim();
}

function readRoadmapTaskStatus(content, task) {
  const pattern = new RegExp(`^\\d+\\. ${escapeRegExp(task)} [^：\\n]+：([^；\\n]+)；$`, "mu");
  const match = content.match(pattern);

  if (!match) {
    throw new Error(`ROADMAP.md 缺少当前任务 ${task} 的正式状态。`);
  }

  return match[1].trim();
}

function readProjectPhaseStatus(content, phase) {
  const pattern = new RegExp(
    `^\\| ${escapeRegExp(phase)} \\| [^|]+ \\| [^|]+ \\| ([^|]+) \\|$`,
    "mu",
  );
  const match = content.match(pattern);

  if (!match) {
    throw new Error(`PROJECT.md 缺少当前阶段 ${phase} 的路线表状态。`);
  }

  return match[1].trim();
}

async function readProjectFile(file) {
  return readFile(path.join(projectRoot, file), "utf8");
}

async function main() {
  const entries = await Promise.all(
    statusFiles.map(async (file) => [file, await readProjectFile(file)]),
  );
  const documents = Object.fromEntries(entries);

  for (const [file, content] of entries) {
    if (sectionIdentifierPattern.test(content)) {
      throw new Error(`${file} 包含 Section 标识；正式状态治理文件只允许记录 Phase 和 Task。`);
    }
  }

  const sourceFile = statusFiles[0];
  const sourceStatus = Object.fromEntries(
    fieldLabels.map((label) => [label, readStatusField(documents[sourceFile], label, sourceFile)]),
  );

  const sourceTaskStatus = readTaskStatus(
    documents[sourceFile],
    sourceStatus["Current Task"],
    sourceFile,
  );

  if (sourceTaskStatus !== sourceStatus["Current Task Status"]) {
    throw new Error(
      `${sourceFile} 的当前任务状态不一致：字段为 “${sourceStatus["Current Task Status"]}”，任务清单为 “${sourceTaskStatus}”。`,
    );
  }

  const roadmapPhaseStatus = readRoadmapPhaseStatus(
    documents["ROADMAP.md"],
    sourceStatus["Current Phase"],
  );
  const roadmapTaskStatus = readRoadmapTaskStatus(
    documents["ROADMAP.md"],
    sourceStatus["Current Task"],
  );
  const projectPhaseStatus = readProjectPhaseStatus(
    documents["PROJECT.md"],
    sourceStatus["Current Phase"],
  );

  if (roadmapPhaseStatus !== sourceStatus["Phase Status"]) {
    throw new Error(
      `ROADMAP.md 的当前 Phase 正式状态为 “${roadmapPhaseStatus}”，应为 “${sourceStatus["Phase Status"]}”。`,
    );
  }

  if (roadmapTaskStatus !== sourceStatus["Current Task Status"]) {
    throw new Error(
      `ROADMAP.md 的当前 Task 正式状态为 “${roadmapTaskStatus}”，应为 “${sourceStatus["Current Task Status"]}”。`,
    );
  }

  if (projectPhaseStatus !== sourceStatus["Phase Status"]) {
    throw new Error(
      `PROJECT.md 路线表中的当前 Phase 状态为 “${projectPhaseStatus}”，应为 “${sourceStatus["Phase Status"]}”。`,
    );
  }

  for (const file of statusFiles.slice(1)) {
    for (const label of fieldLabels) {
      const actual = readStatusField(documents[file], label, file);
      const expected = sourceStatus[label];

      if (actual !== expected) {
        throw new Error(
          `${file} 的 ${label} 为 “${actual}”，应与 ${sourceFile} 一致为 “${expected}”。`,
        );
      }
    }
  }

  console.log("项目状态一致性检查通过。");
  console.log(`Current Phase: ${sourceStatus["Current Phase"]} (${sourceStatus["Phase Status"]})`);
  console.log(
    `Current Task: ${sourceStatus["Current Task"]} (${sourceStatus["Current Task Status"]})`,
  );
  console.log(`Checked: ${statusFiles.join(", ")}`);
}

main().catch((error) => {
  console.error(`项目状态一致性检查失败：${error.message}`);
  process.exitCode = 1;
});
