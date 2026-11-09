export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="dashboard-switch-role dashboard-logout-button" type="submit">
        Keluar
      </button>
    </form>
  );
}
