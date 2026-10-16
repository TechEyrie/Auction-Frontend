'use client';

import Link from 'next/link';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import { CAREERS_EMAIL } from '../../lib/siteContact';
import './about.css';

export default function AboutPage() {
  return (
    <div style={css(PAGE_ROOT)}>
      <title>About us — Araq &amp; Kahraman Auctions</title>
      <SiteHeader />

      {/* @generated */}
      <section style={css("background: #FFFFFF; border-bottom: 1px solid #E6E4DF")}>
        <div style={css("max-width: 1240px; margin: 0 auto; padding: 64px 24px; display: flex; flex-wrap: wrap; gap: 48px; align-items: center")}>
          <div style={css("flex: 999 1 520px; min-width: 0")}>
            <p style={css("margin: 0 0 16px; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9A6B12")}>About us</p>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.4rem, 4.6vw, 3.8rem); letter-spacing: -0.035em; font-weight: 700; line-height: 1.05; max-width: 16ch")}>A trusted place to buy, sell and bid.</h1>
            <p style={css("margin: 22px 0 0; font-size: 19px; color: #5B636B; max-width: 52ch")}>Araq & Kahraman Auctions brings everyday classifieds and live auctions together in one simple, honest marketplace.</p>
          </div>
          <div style={css("flex: 1 1 300px; display: flex; justify-content: center")}>
            <div style={css("width: min(340px, 100%); aspect-ratio: 1; border-radius: 50%; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
              <img src="/logo.png" alt="Araq & Kahraman Auctions emblem" width="280" height="280" style={css("width: 82%; height: auto; display: block")} />
            </div>
          </div>
        </div>
      </section>
      <section style={css("max-width: 1240px; margin: 0 auto; padding: 72px 24px 0; display: flex; flex-wrap: wrap; gap: 40px")}>
        <h2 style={css("flex: 1 1 280px; margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700; line-height: 1.15")}>Our story</h2>
        <div style={css("flex: 2 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 16px; font-size: 18px; color: #2A3036")}>
          <p style={css("margin: 0")}>Founded in [year], we started with a simple belief: buying and selling should feel fair, clear and personal — whether it's a family car, a rare watch or a piece of Gulf heritage.</p>
          <p style={css("margin: 0")}>Today, people use Araq & Kahraman to list items at a fixed price, or to put them under the hammer and let buyers compete. Every auction runs in the open, with every bid visible, and every seller can be verified.</p>
        </div>
      </section>
      <section style={css("max-width: 1240px; margin: 0 auto; padding: 72px 24px 0")}>
        <h2 style={css("margin: 0 0 24px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700")}>What we offer</h2>
        <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px")}>
          <article style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8h18v12H3z M8 8V5h8v3"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>Classifieds</h3>
            <p style={css("margin: 0 0 14px; color: #5B636B")}>Post for free at a fixed price. Buyers message you directly.</p>
            <Link href="/browse" style={css("font-weight: 600")}>Browse listings →</Link>
          </article>
          <article style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4l6 6 M11 7l6 6 M12.5 5.5l-6 6 3 3 6-6 M8 13l-5 5 2 2 5-5"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>Live auctions</h3>
            <p style={css("margin: 0 0 14px; color: #5B636B")}>Online bidding uses the server price and the server close time. Auto-bid and outbid alerts are not offered.</p>
            <Link href="/auctions" style={css("font-weight: 600")}>See live auctions →</Link>
          </article>
          <article style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>Auctions for businesses</h3>
            <p style={css("margin: 0 0 14px; color: #5B636B")}>Fleet, equipment and estate sales handled end to end — inspection, listing and collection.</p>
            <Link href="/contact" style={css("font-weight: 600")}>Talk to our team →</Link>
          </article>
        </div>
      </section>
      <section style={css("max-width: 1240px; margin: 0 auto; padding: 72px 24px 0")}>
        <div style={css("background: #15191E; color: #FFFFFF; border-radius: 24px; padding: clamp(28px, 4vw, 52px)")}>
          <h2 style={css("margin: 0 0 28px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700")}>What we stand for</h2>
          <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 28px")}>
            <div>
              <div style={css("height: 3px; width: 40px; background: #D4A84B; margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>Trust</h3>
              <p style={css("margin: 0; color: #C9CFCB")}>Verified sellers, honest listings and a team that answers.</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: #D4A84B; margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>Transparency</h3>
              <p style={css("margin: 0; color: #C9CFCB")}>Every bid visible. Every fee shown before you commit.</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: #D4A84B; margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>Simplicity</h3>
              <p style={css("margin: 0; color: #C9CFCB")}>Post in minutes, bid in one tap. No clutter.</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: #D4A84B; margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>Heritage</h3>
              <p style={css("margin: 0; color: #C9CFCB")}>A home for rare and meaningful pieces from the region.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="careers" style={css("max-width: 1240px; margin: 0 auto; padding: 72px 24px 80px")}>
        <div style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 24px; padding: clamp(28px, 4vw, 48px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between")}>
          <div style={css("flex: 1 1 460px; min-width: 0")}>
            <p style={css("margin: 0 0 10px; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9A6B12")}>Careers</p>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>Work with us</h2>
            <p style={css("margin: 10px 0 0; color: #5B636B; font-size: 17px; max-width: 54ch")}>We're always glad to hear from auctioneers, valuers, engineers, designers and customer-care people who care about getting the details right.</p>
            <p style={css("margin: 14px 0 0; font-size: 16px")}>
              {"Send your CV to "}
              <a href={`mailto:${CAREERS_EMAIL}`} style={css("font-weight: 700; color: #9A6B12")}>
                {CAREERS_EMAIL}
              </a>
            </p>
          </div>
          <Link href="/contact" className="btn-primary" style={css("height: 52px; padding: 0 24px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; display: flex; align-items: center")}>Get in touch</Link>
        </div>
      </section>
{/* @end-generated */}

      <SiteFooter careersHref="#careers" />
    </div>
  );
}
