"use client"

import { HelpCircle, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type HelpSection = {
  section: string
  title: string
  body: string
}

const HELP_SECTIONS: HelpSection[] = [
  {
    section: "Objective",
    title: "What will you do?",
    body: `Your objective is to develop microbial treatments for a series of contamination
sites. Each treatment must be composed of three microbes whose combined attributes
and traits best match the site's requirements.

You will work across 3 sites in sequence, completing 4 steps at each one. All
three sites share a single 30-minute timer — time management is part of the
challenge.

Your performance is evaluated at each step, and your final score reflects your
decisions across the entire session.`,
  },
  {
    section: "Site Information",
    title: "Understanding Site Information",
    body: `Each site has a set of requirements displayed on the information panel. These
requirements define the attribute ranges that an effective treatment must satisfy,
as well as the traits that are desired or undesired in the selected microbes.

Attribute ranges specify the acceptable minimum and maximum values for each
attribute. Desired and undesired traits indicate which microbe characteristics
are beneficial or harmful for that particular site.

During categorization, a single piece of information about the next site is
revealed. This insight may describe an attribute range or a trait, and should
inform how you assign microbes going forward.`,
  },
  {
    section: "Profiling",
    title: "Step 1: Profiling",
    body: `At the start of each site, you will select 2 characteristics to define your
microbe search profile. Each characteristic is either an attribute or a trait.

When selecting an attribute, you will also set a value range using the slider.
This range represents the target values your profile will search for.

Your selections are locked in once confirmed and cannot be changed for the
remainder of the site. Choose carefully based on the site requirements shown
in the information panel.`,
  },
  {
    section: "Categorization",
    title: "Step 2: Categorization",
    body: `You will be presented with 10 microbes, one at a time. For each microbe,
assign it to one of three destinations: the current site, the next site,
or return it to the pool.

Use the site information panel to evaluate each microbe. Microbes assigned
to the next site will be available for review when you reach that site.
Microbes marked as return will not appear again.

At the third site, the next site option is not available. All microbes must
be assigned to either the current site or returned.`,
  },
  {
    section: "Review",
    title: "Step 0: Review",
    body: `At sites 2 and 3, before beginning categorization, you will review the
microbes that were assigned to this site during the previous site's
categorization step.

You now have access to full site information, whereas previously you only
had a partial insight. Use this additional information to decide whether
each microbe should be kept for use at this site or returned.

This step does not affect your categorization score from the previous site.
It is an opportunity to refine your pool before proceeding.`,
  },
  {
    section: "Prospect Pool",
    title: "Step 3: Prospect Pool",
    body: `Your prospect pool is assembled over 4 rounds of selection. Each round
presents 3 candidate microbes. You must select exactly 1 candidate per round
to add to your pool.

You begin each site with 6 microbes already preloaded into your prospect pool.
Your 4 selections will bring the total to 10, which forms the complete pool
available for the treatment step.

Consider each candidate's attributes and traits in the context of the site
requirements. Your selections directly determine the quality of options
available to you in the next step.`,
  },
  {
    section: "Treatment",
    title: "Step 4: Treatment",
    body: `From your prospect pool of 10 microbes, select 3 to form the site treatment.
The treatment is evaluated based on 5 conditions derived from the site
requirements.

The three microbes are assessed as a group, not individually. The 5 conditions are:
1) the average Mobility of your 3 selected microbes is within the site's Mobility range,
2) the average Agility is within the site's Agility range,
3) the average Size is within the site's Size range,
4) at least one selected microbe has the desired trait, and
5) none of the selected microbes has the undesired trait.

Each condition is worth an equal share of the treatment score. Satisfying
all 5 conditions results in a perfect score for this step.`,
  },
  {
    section: "Scoring",
    title: "How scoring works",
    body: `Each step is scored independently on a scale of 0 to 100. Your score for
each step reflects the accuracy of your decisions relative to the optimal
outcome for that site.

Profiling is scored based on whether your selected characteristic and range
match the site's most strategically valuable option. Categorization is scored
based on how many microbes you assigned correctly. Prospect Pool is scored
based on the quality of your selections across the 4 rounds. Treatment is
scored based on how many of the 5 conditions your final selection satisfies.

Your overall score is the average of all step scores across all 3 sites.`,
  },
]

export function GameHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState("Objective")

  useEffect(() => {
    if (open) setActiveSection("Objective")
  }, [open])

  const active = useMemo(
    () => HELP_SECTIONS.find((item) => item.section === activeSection) ?? HELP_SECTIONS[0],
    [activeSection],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Help"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-row overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 transition-colors hover:text-gray-700"
          aria-label="Close help"
        >
          <X className="h-5 w-5" />
        </button>

        <aside className="w-48 shrink-0 bg-[#F7DC6F] py-4">
          <div className="flex items-center gap-2 border-b border-yellow-300 px-4 pb-3">
            <HelpCircle className="h-4 w-4 text-gray-900" />
            <h2 className="font-bold text-gray-900">Help</h2>
          </div>
          <nav className="mt-2 flex flex-col">
            {HELP_SECTIONS.map((item) => {
              const isActive = item.section === active.section
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => setActiveSection(item.section)}
                  className={`cursor-pointer px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "mx-2 rounded-lg bg-white/60 font-semibold text-gray-900"
                      : "text-gray-800 hover:bg-white/30"
                  }`}
                >
                  {item.section}
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="flex-1 overflow-y-auto p-6">
          <h3 className="mb-3 text-xl font-bold text-gray-900">{active.title}</h3>
          {active.body.split("\n\n").map((paragraph) => (
            <p key={paragraph} className="mb-3 text-sm leading-relaxed text-gray-700">
              {paragraph}
            </p>
          ))}
        </section>
      </div>
    </div>
  )
}
