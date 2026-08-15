export default function DevIndexPage() {
  return (
    <main>
      <h1>Dev playground</h1>
      <p>This route is excluded from production builds.</p>
      <ul>
        <li>
          <a href="/dev/styleguide">Styleguide (T1.2)</a>
        </li>
        <li>
          <a href="/dev/flip">Page flip (T1.3)</a>
        </li>
      </ul>
    </main>
  );
}
