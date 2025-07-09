export const ProgressBar = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-black h-2 rounded-full transition-all duration-300 ease-in-out"
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={`${progress}% complete`}
    />
  </div>
)
