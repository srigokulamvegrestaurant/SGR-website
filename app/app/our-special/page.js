import { redirect } from 'next/navigation';

export default async function OurSpecialPage({ searchParams }) {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryString = resolvedParams && Object.keys(resolvedParams).length > 0
    ? '?' + new URLSearchParams(resolvedParams).toString()
    : '';
  redirect(`/${queryString}#specials`);
}
