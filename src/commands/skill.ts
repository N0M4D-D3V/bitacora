import { installBitacoraSkill } from "../core/skill-installer";

interface SkillCommandOptions {
  rootDir: string;
}

interface SkillCommandDependencies {
  onError?: (message: string) => void;
}

export function runSkillCommand(
  options: SkillCommandOptions,
  dependencies: SkillCommandDependencies = {}
): number {
  const onError = dependencies.onError ?? (() => {});

  try {
    installBitacoraSkill(options.rootDir);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError(message);
    return 1;
  }
}
