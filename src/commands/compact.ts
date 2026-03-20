import { compactTrack, compactTracksRegistry } from "../core/compaction";
import { validateMemory } from "../core/validator";

interface CompactCommandOptions {
  rootDir: string;
  trackId?: string;
  all: boolean;
  complete: boolean;
  dryRun: boolean;
}

interface CompactCommandDependencies {
  now?: () => string;
  onOutput?: (message: string) => void;
  onError?: (message: string) => void;
}

function formatSavings(label: string, before: number, after: number, tokensBefore: number, tokensAfter: number): string {
  const bytesSaved = before - after;
  const tokensSaved = tokensBefore - tokensAfter;
  return `${label}: bytes ${before} -> ${after} (${bytesSaved >= 0 ? "-" : "+"}${Math.abs(bytesSaved)}), tokens ${tokensBefore} -> ${tokensAfter} (${tokensSaved >= 0 ? "-" : "+"}${Math.abs(tokensSaved)})`;
}

export function runCompactCommand(
  options: CompactCommandOptions,
  dependencies: CompactCommandDependencies = {}
): number {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const onOutput = dependencies.onOutput ?? (() => {});
  const onError = dependencies.onError ?? (() => {});

  if (options.all && options.trackId) {
    onError("Use either --all or --track-id, not both");
    return 1;
  }

  if (!options.all && !options.trackId) {
    onError("Missing target. Provide --track-id <TRACK-###> or --all");
    return 1;
  }

  const initialValidation = validateMemory(options.rootDir);
  if (!initialValidation.ok) {
    onError(`Memory structure is invalid: ${initialValidation.errors.join("; ")}`);
    return 1;
  }

  const targets = options.trackId
    ? [options.trackId]
    : initialValidation.tracks.map((track) => track.frontmatter.track_id).sort((left, right) => left.localeCompare(right));

  const timestamp = now();
  let compactedCount = 0;

  for (const trackId of targets) {
    try {
      const result = compactTrack({
        rootDir: options.rootDir,
        trackId,
        complete: options.complete,
        dryRun: options.dryRun,
        now: timestamp
      });

      if (!result.compacted) {
        onOutput(`${trackId}: skipped (${result.skippedReason ?? "not eligible"})`);
        continue;
      }

      compactedCount += 1;
      onOutput(formatSavings(trackId, result.bytesBefore, result.bytesAfter, result.estimatedTokensBefore, result.estimatedTokensAfter));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onError(message);
      if (options.trackId) {
        return 1;
      }
    }
  }

  if (compactedCount === 0) {
    onOutput("No tracks compacted");
    return options.trackId ? 1 : 0;
  }

  const finalValidation = validateMemory(options.rootDir);
  if (!finalValidation.ok) {
    onError(`Memory structure is invalid: ${finalValidation.errors.join("; ")}`);
    return 1;
  }

  const registrySavings = compactTracksRegistry({
    rootDir: options.rootDir,
    now: timestamp,
    tracks: finalValidation.tracks,
    dryRun: options.dryRun
  });
  onOutput(
    formatSavings(
      "tracks.md",
      registrySavings.bytesBefore,
      registrySavings.bytesAfter,
      registrySavings.estimatedTokensBefore,
      registrySavings.estimatedTokensAfter
    )
  );

  onOutput(`Compacted tracks: ${compactedCount}`);
  return 0;
}
