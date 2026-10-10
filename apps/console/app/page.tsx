import { Card } from "@heroui/react";
import { BrandMark } from "@suryasaathi/ui";

export default function ConsoleHome() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <BrandMark />
        <span className="text-sm text-muted">DISCOM console</span>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title>Escalation queue</Card.Title>
            <Card.Description>Cases where the vendor missed its deadline.</Card.Description>
          </Card.Header>
          <Card.Content className="text-muted">Not built yet.</Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Vendor leaderboard</Card.Title>
            <Card.Description>Fix rates and response times by vendor.</Card.Description>
          </Card.Header>
          <Card.Content className="text-muted">Not built yet.</Card.Content>
        </Card>
      </div>
    </main>
  );
}
