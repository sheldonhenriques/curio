export default async function ProjectPage({ params }) {
  const { id } = await params;

  return (
    <div className="p-6 text-xl text-gray-800 dark:text-white">
      <h1>Project ID: {id}</h1>
      {/* You can fetch project details here using the id */}
    </div>
  );
}
