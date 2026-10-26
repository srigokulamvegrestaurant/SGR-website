import { redirect } from 'next/navigation';

export default async function SpecialsPage({ searchParams }) {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryString = resolvedParams && Object.keys(resolvedParams).length > 0
    ? '?' + new URLSearchParams(resolvedParams).toString()
    : '';
  redirect(`/${queryString}#specials`);
}
