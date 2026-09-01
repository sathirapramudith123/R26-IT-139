"use client";

export default function PredictionResult({
  result,
  positiveLabel = "Positive",
  negativeLabel = "Negative",
  scoreLabel = "Score",
}) {
  if (!result) return null;

  const isRegression = result.score === undefined;
  const rawPrediction = result.prediction;
  const isPositive = rawPrediction === 1 || rawPrediction === true;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Prediction Output
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Decision / Outcome
          </span>
          <div className="mt-2 flex items-center gap-2">
            {!isRegression ? (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  isPositive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                }`}
              >
                {isPositive ? positiveLabel : negativeLabel}
              </span>
            ) : (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {rawPrediction}
              </span>
            )}
          </div>
        </div>

        {!isRegression && (
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {scoreLabel}
            </span>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {result.score}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}