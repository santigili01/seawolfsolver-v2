"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BottomCTA } from "@/components/landing/bottom-cta"
import { cn } from "@/lib/utils"

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

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 mt-0">
            Thinking about whether to use a prep tool?
          </p>

          <Accordion type="single" collapsible className="mt-0">
            <AccordionItem value="cheating-1">
              <AccordionTrigger className="py-5 text-left text-base font-medium">
                Is using a prep tool considered cheating?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. Preparing for an assessment is not cheating — it&apos;s exactly what McKinsey expects serious candidates to do.
                McKinsey publishes sample questions, YouTube is full of walkthroughs, and prep courses have existed for decades.
                Using a simulator to get familiar with the format, the phases, and the scoring logic is no different from
                practicing case interviews. The assessment measures your cognitive abilities — practicing sharpens them, it
                doesn&apos;t fake them.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cheating-2">
              <AccordionTrigger className="py-5 text-left text-base font-medium">
                Can McKinsey tell if I practiced with a simulator?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. McKinsey has no visibility into what preparation tools you used before your assessment. What they measure
                is your performance on the day — your decision speed, your accuracy, and your pattern recognition under time
                pressure. Practicing with a simulator improves all three. There is nothing in the assessment that detects
                prior practice, and no policy against using prep tools.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cheating-3">
              <AccordionTrigger className="py-5 text-left text-base font-medium">
                Why do top candidates use prep tools?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Because the format is unfamiliar and time pressure is real. Most candidates who struggle with McKinsey Solve
                don&apos;t struggle because they lack ability — they struggle because they encounter the interface, the phase
                structure, and the scoring logic for the first time under pressure. Practicing removes that disadvantage. The
                candidates who score in the top deciles are almost always the ones who walked in already knowing what to
                expect.
              </AccordionContent>
            </AccordionItem>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={cn(index === 0 && "mt-4 border-t border-border pt-8")}
              >
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
