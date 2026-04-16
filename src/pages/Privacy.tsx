import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: January 14, 2026
            </p>
          </div>

          <div className="space-y-6 text-sm">
            <section>
              <h2 className="font-semibold text-xl mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Sub-Notes ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service, including the desktop application, web interface, and any associated APIs.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">2. Information We Collect</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-base mb-2">2.1 Account Information</h3>
                  <p className="text-muted-foreground">
                    When you create an account, we collect your email address and authentication credentials. If you sign in using Google OAuth, we receive your Google account email and profile information.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">2.2 Usage Data</h3>
                  <p className="text-muted-foreground">
                    We collect information about your use of the Service, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                    <li>YouTube channels and videos you subscribe to or process</li>
                    <li>Summaries generated and their content</li>
                    <li>Usage metrics for billing purposes (number of summaries, API usage)</li>
                    <li>Notification preferences and settings</li>
                    <li>Storage integration preferences (Obsidian, Google Drive, Dropbox)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">2.3 API Keys (BYOK Tier)</h3>
                  <p className="text-muted-foreground">
                    If you use the Bring Your Own Key (BYOK) tier, you may provide your own YouTube and Gemini API keys. These keys are stored encrypted in our database and used solely to process your content.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">2.4 Technical Information</h3>
                  <p className="text-muted-foreground">
                    We automatically collect certain technical information, including IP addresses, browser type, device information, and usage patterns to maintain and improve the Service.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process video transcripts and generate AI summaries</li>
                <li>Send notification emails about new content summaries</li>
                <li>Calculate usage-based billing through our integration with Orb</li>
                <li>Respond to your requests and provide customer support</li>
                <li>Monitor and analyze usage patterns to improve performance</li>
                <li>Detect and prevent fraud, abuse, and security issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">4. Data Sharing and Third-Party Services</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-base mb-2">4.1 Service Providers</h3>
                  <p className="text-muted-foreground mb-2">
                    We share your information with trusted third-party service providers who assist us in operating the Service:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li><strong>Supabase</strong>: Database, authentication, and backend infrastructure</li>
                    <li><strong>Google Vertex AI</strong>: AI-powered summary generation using Gemini models</li>
                    <li><strong>YouTube API</strong>: Fetching channel and video metadata</li>
                    <li><strong>Resend</strong>: Email delivery for notifications and authentication</li>
                    <li><strong>Orb</strong>: Usage-based billing and subscription management</li>
                    <li><strong>Google Drive / Dropbox</strong>: Cloud storage sync (if enabled by you)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">4.2 Transcript Caching</h3>
                  <p className="text-muted-foreground">
                    Transcripts fetched from YouTube may be cached to improve service performance and reduce API costs. Cached transcripts are shared across users to optimize system efficiency. We do not cache or share your personal summaries or account information.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">4.3 No Sale of Personal Information</h3>
                  <p className="text-muted-foreground">
                    We do not sell, rent, or trade your personal information to third parties for marketing purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure storage of API keys in Supabase Vault</li>
                <li>Row-level security policies to ensure data isolation between users</li>
                <li>Regular security audits and updates</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal or regulatory purposes.
              </p>
              <p className="text-muted-foreground mt-2">
                Cached transcripts may be retained longer to maintain system efficiency, but these are not linked to your personal account.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">7. Your Rights and Choices</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-base mb-2">7.1 Access and Correction</h3>
                  <p className="text-muted-foreground">
                    You can access and update your account information through the Settings page in the application.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">7.2 Data Deletion</h3>
                  <p className="text-muted-foreground">
                    You can delete your account and associated data at any time through the Settings page. Upon deletion, all your personal information, subscriptions, and summaries will be permanently removed.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">7.3 Email Preferences</h3>
                  <p className="text-muted-foreground">
                    You can manage your email notification preferences in the Settings page. You can opt out of summary notification emails while still receiving essential account-related emails.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-base mb-2">7.4 Data Portability</h3>
                  <p className="text-muted-foreground">
                    You can export your summaries at any time through the dashboard or sync them to external storage services like Obsidian, Google Drive, or Dropbox.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Sub-Notes is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">9. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from your country. By using the Service, you consent to the transfer of your information to the United States and other countries where we operate.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">10. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">11. California Privacy Rights</h2>
              <p className="text-muted-foreground">
                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete your information, and the right to opt-out of the sale of your information (which we do not engage in).
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">12. GDPR Compliance</h2>
              <p className="text-muted-foreground">
                If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the right to access, rectify, erase, restrict processing, and data portability. You also have the right to object to processing and to lodge a complaint with a supervisory authority.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-xl mb-3">13. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us through the Sub-Notes application or GitHub repository.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
