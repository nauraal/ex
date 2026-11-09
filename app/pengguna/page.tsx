import Image from "next/image";
import Link from "next/link";

export default function UserPage() {
  return (
    <main className="customer-splash">
      <Image
        className="customer-splash-background"
        src="/zazi/shop.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <Link className="customer-splash-logo" href="/" aria-label="Zazi Donut">
        <Image
          src="/zazi/logo.png"
          alt="Zazi Donut"
          width={112}
          height={112}
          loading="eager"
        />
      </Link>
      <h1 className="customer-splash-title">ZAZI DONUT</h1>
      <Link className="customer-splash-start" href="/login?role=pengguna">
        Press to Start!
      </Link>
    </main>
  );
}
