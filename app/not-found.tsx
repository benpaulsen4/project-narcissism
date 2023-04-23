export default function NotFound() {
  return (
    <div className="animate">
      <div className="d-flex">
        <h1>Not Found</h1>
        <h1 className="slash">/</h1>
      </div>

      <div className="not-found">
        <span style={{ fontSize: "8rem" }}>🤔</span>
        <h2 style={{ textAlign: "center" }}>
          Not sure about that one chief. Maybe try one of the links on the left
          or top of the page.
        </h2>
      </div>
    </div>
  );
}
