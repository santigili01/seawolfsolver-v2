"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BottomCTA } from "@/components/landing/bottom-cta"

const faqs = [
  {
    question: "How is this different from a $25 Excel solver?",
    answer:
      "Excel solvers only handle the Treatment phase (Phase 4) and require macro-enabled files — which many corporate laptops block and security tools flag. SeaWolfPrep is fully browser-based, covers all 4 phases including the Prospect Pool, and includes a full simulator. No downloads.",
  },
  {
    question: "How does this compare to other prep tools?",
    answer:
      "Leading prep tools charge $150–240 for 6-month access windows. SeaWolfPrep charges $25 one-time, lifetime access. Same realistic gameplay — built on the same game mechanics — at a fraction of the price.",
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
      "Yes — within 14 days, provided you haven't used the solver and have completed fewer than 2 simulator runs. That's why we offer a full free demo — try before you buy.",
  },
  {
    question: "Does the free demo count toward my paid access?",
    answer:
      "No. The free demo is a separate fixed scenario. Your paid account starts fresh with all 300+ scenarios available.",
  },
  {
    question: "Will you add Redrock and Sustainable Futures Lab?",
    answer:
      "Yes. Redrock is next. Current Simulator + Solver buyers get free access when it launches — this is a limited-time offer that won't last forever.",
  },
]

export function FAQ() {
  return (
    <>
      <BottomCTA />
      <section
        id="faq"
        className="relative z-0 scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="mt-0 mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Questions
            </h2>
            <p className="mb-12 text-lg text-muted-foreground">Everything you need to know before buying.</p>
          </div>

          <Accordion type="single" collapsible className="mt-0">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="py-5 text-left text-base font-medium">
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
    </>
  )
}
