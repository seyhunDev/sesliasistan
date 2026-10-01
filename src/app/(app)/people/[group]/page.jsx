"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/features/data/DataProvider";
import { PeopleList } from "@/features/people/PeopleList";
import { PEOPLE_GROUPS } from "@/lib/kinds";

// /people/staff · /people/family · /people/athletes · /people/other (yalnızca ana hesap)
export default function PeopleGroupPage() {
  const { group } = useParams();
  const { isStaff } = useData();
  const router = useRouter();
  const ok = !isStaff && PEOPLE_GROUPS[group];
  useEffect(() => {
    if (!ok) router.replace(isStaff ? "/" : "/staff");
  }, [ok, isStaff, router]);
  if (!ok) return null;
  return <PeopleList group={group} />;
}
