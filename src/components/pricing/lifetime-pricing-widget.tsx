'use client'
import * as React from 'react'
import {FunctionComponent} from 'react'
import {useViewer} from '@/context/viewer-context'
import {redirectToStandardCheckout} from '@/api/stripe/stripe-checkout-redirect'
import emailIsValid from '@/utils/email-is-valid'
import {track} from '@/utils/analytics'
import {useRouter, useSearchParams} from 'next/navigation'
import PoweredByStripe from '@/components/pricing/powered-by-stripe'
import Spinner from '../spinner'
import slugify from 'slugify'

// TODO: Extract PlanTitle and PlanPrice to shared components.

const PlanTitle: React.FunctionComponent<React.PropsWithChildren<unknown>> = ({
  children,
}) => (
  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
    {children}
  </h2>
)

export const PlanPrice: React.FunctionComponent<
  React.PropsWithChildren<{
    plan: {price: number; price_discounted?: number}
    pricesLoading: boolean
  }>
> = ({plan, pricesLoading}) => {
  const {price, price_discounted} = plan
  const priceToDisplay = price_discounted || price
  const discount_percentage = price_discounted
    ? Math.round(((price - price_discounted) * 100) / price)
    : null
  return (
    <div className="flex items-center">
      <div className="flex items-end leading-none">
        <span className="self-start mt-1">USD</span>
        <span className="text-4xl font-light">$</span>
        <span className="self-stretch text-4xl font-extrabold">
          {price_discounted ? (
            <div className="flex items-end">
              <div className={`relative ${pricesLoading ? 'opacity-60' : ''}`}>
                {pricesLoading && (
                  <Spinner className="absolute text-current" size={6} />
                )}
                {priceToDisplay}
              </div>
              <div className="flex flex-col items-start ml-2">
                <div className="relative text-xl opacity-90 before:h-[2px] before:rotate-[-19deg] before:absolute before:bg-current before:w-full flex justify-center items-center text-center">
                  &nbsp;{price}&nbsp;
                </div>
                <div className="text-sm font-semibold text-blue-600 uppercase dark:text-amber-400">
                  save {discount_percentage}%
                </div>
              </div>
            </div>
          ) : (
            <div className={`relative ${pricesLoading ? 'opacity-60' : ''}`}>
              {priceToDisplay}
              {pricesLoading && (
                <Spinner className="absolute text-current " size={6} />
              )}
            </div>
          )}
        </span>
      </div>
    </div>
  )
}

const GetAccessButton: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string
    handleClick: () => void
    loaderOn: boolean
    pricesLoading: boolean
  }>
> = ({label, handleClick, loaderOn, pricesLoading}) => {
  return (
    <button
      disabled={pricesLoading}
      className={`w-full px-5 py-2 h-[60px] flex justify-center items-center mt-8 font-semibold text-center text-white transition-all duration-300 ease-in-out bg-blue-600 rounded-md ${
        pricesLoading
          ? 'opacity-60 cursor-default'
          : 'hover:bg-blue-700 hover:scale-105'
      }`}
      onClick={(event) => {
        event.preventDefault()
        handleClick()
      }}
      type="button"
    >
      {loaderOn || pricesLoading ? (
        <Spinner className="absolute text-white" size={6} />
      ) : (
        label
      )}
    </button>
  )
}

const DEFAULT_FEATURES = [
  'Full access to all the premium courses',
  'Closed captions for every video',
  'Commenting and support',
  'Enhanced Transcripts',
  'RSS course feeds',
]

const PlanFeatures: React.FunctionComponent<
  React.PropsWithChildren<{
    planFeatures?: string[]
  }>
> = ({planFeatures = DEFAULT_FEATURES}) => {
  const CheckIcon = () => (
    <svg
      className="flex-shrink-0 inline-block mt-1 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        d="M6.00266104,15 C5.73789196,15 5.48398777,14.8946854 5.29679603,14.707378 L0.304822855,9.71382936 C0.0452835953,9.46307884 -0.0588050485,9.09175514 0.0325634765,8.74257683 C0.123932001,8.39339851 0.396538625,8.12070585 0.745606774,8.02930849 C1.09467492,7.93791112 1.46588147,8.04203262 1.71655287,8.30165379 L5.86288579,12.4482966 L14.1675324,0.449797837 C14.3666635,0.147033347 14.7141342,-0.0240608575 15.0754425,0.00274388845 C15.4367507,0.0295486344 15.7551884,0.250045268 15.9074918,0.578881992 C16.0597953,0.907718715 16.0220601,1.29328389 15.8088932,1.58632952 L6.82334143,14.5695561 C6.65578773,14.8145513 6.38796837,14.9722925 6.09251656,15 C6.06256472,15 6.03261288,15 6.00266104,15 Z"
      />
    </svg>
  )

  return (
    <ul>
      {planFeatures.map((feature: string) => {
        return (
          <li className="flex py-2 font-medium" key={slugify(feature)}>
            <CheckIcon />
            <span className="ml-2 leading-tight">{feature}</span>
          </li>
        )
      })}
    </ul>
  )
}

const LifetimePricingWidget: FunctionComponent<
  React.PropsWithChildren<{hidePoweredByStripe?: boolean}>
> = ({hidePoweredByStripe = false}) => {
  const {viewer, authToken} = useViewer()

  const router = useRouter()
  const params = useSearchParams()
  const stripeParam = params?.get('stripe')

  const [loaderOn, setLoaderOn] = React.useState<boolean>(false)

  // TODO: commerce machine pulls in prices for Yearly/Monthly/Quarterly and
  // provides the `priceId` for the currently selected plan.
  // Instead, we want a single Lifetime Membership `priceId` coming back.
  //
  // Since `useCommerceMachine` is a thin wrapper around `CommerceMachine`,
  // we might be able to add a separate `useLifetimeCommerceMachine` that
  // can get the details we want for this component?
  //
  // However, I do wonder if there is an even more hardcoded way of getting
  // to this that would be faster than modifying the commerce machine.
  //   const {
  //     state,
  //     send,
  //     priceId,
  //     quantity,
  //     prices,
  //     availableCoupons,
  //     currentPlan,
  //   } = useCommerceMachine()

  const priceId = process.env.NEXT_PUBLIC_STRIPE_LIFETIME_MEMBERSHIP_PRICE_ID
  const quantity = 1
  const pricesLoading = false

  // machine-derived states
  //   const pricesLoading = !state.matches('pricesLoaded')
  //   const pppCouponIsApplied =
  //     state.matches('pricesLoaded.withPPPCoupon') ||
  //     (pricesLoading && state.context?.couponToApply?.couponType === 'ppp')

  // machine-derived data
  //   const parityCoupon = availableCoupons?.['ppp']

  //   const countryCode = get(parityCoupon, 'coupon_region_restricted_to')
  //   const countryName = get(parityCoupon, 'coupon_region_restricted_to_name')

  //   const pppCouponAvailable =
  //     !isEmpty(countryName) && !isEmpty(countryCode) && !isEmpty(parityCoupon)
  //   const pppCouponEligible = quantity === 1

  //   const appliedCoupon = get(state.context.pricingData, 'applied_coupon')

  //   // handlers
  //   const onApplyParityCoupon = () => {
  //     send('APPLY_PPP_COUPON')
  //   }

  //   const onDismissParityCoupon = () => {
  //     send('REMOVE_PPP_COUPON')
  //   }

  const onClickCheckout = async () => {
    if (!priceId) return
    await track('lifetime checkout: selected plan', {
      priceId: priceId,
    })

    if (emailIsValid(viewer?.email)) {
      // Note: we don't want to do a `hasProAccess` check to abort the purchase.
      // Instead, we let them through so that they can make the purchase because
      // if they already have Pro, then this upgrades them to Lifetime Pro.

      // the user doesn't have pro access, proceed to checkout
      await track('lifetime checkout: valid email present', {
        priceId: priceId,
      })
      await track('lifetime checkout: redirect to stripe', {
        priceId,
      })
      redirectToStandardCheckout({
        priceId,
        email: viewer.email,
        authToken,
        quantity,
        successPath: '/confirm/forever',
        cancelPath: '/pricing/forever',
        // coupon: state.context.couponToApply?.couponCode,
      })
    } else {
      await track('checkout: get email', {
        priceId: priceId,
      })

      // const couponCode = state.context.couponToApply?.couponCode

      router.push(
        '/forever/email?' +
          new URLSearchParams({
            priceId,
            quantity: quantity.toString(),
            // ...(couponCode && {coupon: couponCode}),
          }),
      )
      setLoaderOn(true)
    }
  }

  // TODO: make the priceId and display price come from env vars
  // as an MVP, it is good enough for now to manually make sure those
  // values match up with what is in Stripe.
  const lifetimePlan = {price: 500}

  return (
    <div className="flex flex-col items-center">
      <div className="relative p-2 bg-gray-100 rounded-md shadow-lg dark:bg-gray-800 dark:shadow-none">
        <div className="relative z-10 flex flex-col items-center max-w-sm px-5 py-5 text-gray-900 bg-white rounded-sm dark:text-white dark:bg-gray-900 sm:px-8 sm:py-12">
          <PlanTitle>Lifetime Membership</PlanTitle>
          {/* {!isPPP && appliedCoupon?.coupon_expires_at && !pricesLoading && (
          <Countdown
            label="Save on Yearly Memberships Price goes up in:"
            date={fromUnixTime(appliedCoupon.coupon_expires_at)}
          />
        )} */}
          <div className="py-6">
            <PlanPrice pricesLoading={pricesLoading} plan={lifetimePlan} />
          </div>
          {/* {!appliedCoupon && <PlanPercentageOff interval={currentPlan.name} />}
        {quantityAvailable && (
          <div className="my-4">
            <PlanQuantitySelect
              quantity={currentQuantity}
              plan={currentPlan}
              pricesLoading={pricesLoading}
              onQuantityChanged={(quantity: number) => {
                onQuantityChanged(quantity)
              }}
            />
          </div>
        )} */}

          <PlanFeatures planFeatures={DEFAULT_FEATURES} />
          <GetAccessButton
            label={'Get Lifetime Access'}
            handleClick={onClickCheckout}
            loaderOn={loaderOn}
            pricesLoading={pricesLoading}
          />
        </div>
        {/* <SelectPlanNew
          prices={prices}
          pricesLoading={pricesLoading}
          handleClickGetAccess={() => {
            send({type: 'CONFIRM_PRICE', onClickCheckout})
          }}
          quantityAvailable={true}
          onQuantityChanged={(quantity: number) => {
            send({type: 'CHANGE_QUANTITY', quantity})
          }}
          onPriceChanged={(priceId: string) => {
            send({type: 'SWITCH_PRICE', priceId})
          }}
          currentPlan={currentPlan}
          currentQuantity={quantity}
          loaderOn={loaderOn}
          appliedCoupon={appliedCoupon}
          isPPP={pppCouponIsApplied}
        /> */}
      </div>
      {/* {pppCouponAvailable && pppCouponEligible && (
        <div className="max-w-screen-md pb-5 mx-auto mt-4">
          <ParityCouponMessage
            coupon={parityCoupon as Coupon}
            countryName={countryName as string}
            onApply={onApplyParityCoupon}
            onDismiss={onDismissParityCoupon}
            isPPP={pppCouponIsApplied}
          />
        </div>
      )} */}
      {!hidePoweredByStripe && (
        <div className="flex sm:flex-row flex-col items-center py-24 sm:space-x-5 sm:space-y-0 space-y-5">
          <PoweredByStripe />
          <div className="text-sm">30 day money back guarantee</div>
        </div>
      )}
    </div>
  )
}

export default LifetimePricingWidget
