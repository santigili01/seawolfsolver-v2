import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is the McKinsey Seawolf game?",
    answer:
      "Seawolf is one of the games in McKinsey Solve, McKinsey's gamified assessment. In the final phase you must select the optimal combination of 3 microbes out of 10 to treat an ecosystem site. Each microbe has attributes and traits that must match the site requirements.",
  },
  {
    question: "How does the solver work?",
    answer:
      "You input the 10 microbes' attribute values and check their traits. The solver instantly evaluates all 120 possible combinations of 3 and identifies which one maximizes your score based on the site's target ranges and trait requirements.",
  },
  {
    question: "Is using this tool allowed during the assessment?",
    answer:
      "The solver is a preparation and practice tool. Use it to understand the logic and practice before your assessment date.",
  },
  {
    question: "What's included with my purchase?",
    answer:
      "You get the web-based solver, the Excel version, and access to the free practice simulator — all with one payment.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. The web solver works directly in your browser. The Excel file opens in any version of Excel or Google Sheets.",
  },
  {
    question: "What if I need help?",
    answer:
      "Email us at support@seawolfsolver.com and we'll respond within 24 hours.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 bg-card px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about the Sea Wolf Solver
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
