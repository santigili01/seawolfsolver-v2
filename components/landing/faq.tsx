import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How is this different from a $25 Excel solver?",
    answer:
      "Excel solvers only handle the Treatment phase (Phase 4) and require macro-enabled files — which many corporate laptops block and security tools flag. SeaWolfPrep is fully browser-based, covers all 4 phases including the Prospect Pool, and includes a full simulator. No downloads.",
  },
  {
    question: "How is this different from Prepmatter or PSG Cracked?",
    answer:
      "Same realistic gameplay, 5–10× cheaper, and you keep access forever. Prepmatter charges $239 for 6 months. PSG Cracked charges ~$165. We charge $25, one-time, lifetime.",
  },
  {
    question: "Is SeaWolfPrep affiliated with McKinsey?",
    answer:
      "No. SeaWolfPrep is an independent prep tool. McKinsey, Solve, and Sea Wolf are trademarks of McKinsey & Company. We are not affiliated with, endorsed by, or connected to McKinsey in any way.",
  },
  {
    question: "What McKinsey Solve format does this cover?",
    answer:
      "The current 2026 format: 65-minute test with Redrock Study + Sea Wolf. We cover Sea Wolf in full. Redrock simulator is on the roadmap.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Yes — 14-day refund if you haven't used more than one simulator run. Email us at contact@seawolfprep.com.",
  },
  {
    question: "Does the free demo count toward my paid access?",
    answer:
      "No. The free demo is a separate fixed scenario. Your paid account starts fresh with all 300+ scenarios available.",
  },
  {
    question: "Will you add Redrock and Sustainable Futures Lab?",
    answer:
      "Yes. Redrock is next on the roadmap. Current buyers get free access when it launches.",
  },
]

export function FAQ() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 bg-card px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Questions
          </h2>
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
  )
}
