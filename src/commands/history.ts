import { readTrackHistory } from "../core/compaction";

interface HistoryCommandOptions {
  rootDir: string;
  trackId: string;
  show: boolean;
}

interface HistoryCommandDependencies {
  onOutput?: (message: string) => void;
  onError?: (message: string) => void;
}

export function runHistoryCommand(
  options: HistoryCommandOptions,
  dependencies: HistoryCommandDependencies = {}
): number {
  const onOutput = dependencies.onOutput ?? (() => {});
  const onError = dependencies.onError ?? (() => {});

  try {
    const result = readTrackHistory(options.rootDir, options.trackId, options.show);

    if (!result.exists) {
      onError(`History not found for ${options.trackId}: ${result.historyPath}`);
      return 1;
    }

    if (!options.show) {
      onOutput(`Track: ${result.trackId}`);
      onOutput(`History path: ${result.historyPath}`);
      onOutput("Use --show to print history contents");
      return 0;
    }

    onOutput(result.content ?? "");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError(message);
    return 1;
  }
}
