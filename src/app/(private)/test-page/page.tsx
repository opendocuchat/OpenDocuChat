const Page = () => {
  return (
    <div>
      <h1 className="font-bold">Welcome to the Chat Widget Test Page</h1>
      <p>
        This page demonstrates the embedded chat widget. You should see a chat
        button in the bottom right corner.
      </p>

      <iframe
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "300px",
          height: "400px",
          border: "none",
          zIndex: "9999",
        }}
        src="http://localhost:3000/widget"
      ></iframe>
    </div>
  );
};

export default Page;
