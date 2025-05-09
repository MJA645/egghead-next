import * as React from 'react'
import Link from 'next/link'
import analytics from '@/utils/analytics'
import {usePathname} from 'next/navigation'
import {trpc} from '@/app/_trpc/client'

const LifetimeSaleHeaderBanner = () => {
  const {data: isSaleBannerEnabled} =
    trpc.featureFlag.isLiveWorkshopSale.useQuery({
      flag: 'featureFlagLifetimeSale',
    })
  const pathname = usePathname()

  return isSaleBannerEnabled ? (
    <Link
      href="/pricing"
      onClick={() => {
        analytics.events.activityInternalLinkClick(
          'sale',
          pathname ?? '',
          'lifetime-sale-banner',
        )
      }}
      className="group"
    >
      <div className="flex justify-center pl-2 text-xs text-white bg-gradient-to-r sm:px-2 sm:text-sm from-blue-500 to-indigo-500">
        <div className="py-1 pr-3 leading-tight">
          <span role="img" aria-hidden="true">
            🌟
          </span>{' '}
          Sale: <span>Become a member for a lifetime</span>
        </div>
        <div className="flex items-center flex-shrink-0 px-2 py-px text-white bg-black dark:bg-white dark:bg-opacity-100 bg-opacity-20 dark:text-blue-600">
          <span className="pr-1 font-medium">Become a Member</span>{' '}
          <span role="img" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  ) : null
}

export default LifetimeSaleHeaderBanner
