"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/features/data/DataProvider";
import { PersonPage } from "@/features/people/PersonPage";

// /people/p/<kişi> : kişinin sayfası (yalnızca ana hesap)
export default function PersonRoute() {
  const { uid } = useParams();
  const { isStaff } = useData();
  const router = useRouter();
  useEffect(() => {
    if (isStaff) router.replace("/");
  }, [isStaff, router]);
  if (isStaff || !uid) return null;
  return <PersonPage uid={String(uid)} />;
}
