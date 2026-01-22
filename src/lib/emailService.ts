/**
 * EmailJS Service for sending task assignment notifications
 * 
 * Setup required:
 * 1. Create account at https://www.emailjs.com/
 * 2. Create an email service (Gmail, Outlook, etc.)
 * 3. Create a template with these variables:
 *    - {{to_name}} - Recipient name
 *    - {{to_email}} - Recipient email
 *    - {{task_title}} - Task description
 *    - {{deadline}} - Task deadline
 *    - {{event_title}} - Event name
 *    - {{assigned_by}} - Who assigned the task
 * 4. Add credentials to .env file
 */

interface TaskEmailData {
    recipientEmail: string;
    recipientName: string;
    taskTitle: string;
    deadline?: string;
    eventTitle: string;
    assignedBy: string;
}

// EmailJS configuration from environment
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_EVENT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_EVENT_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

/**
 * Check if EmailJS is configured
 */
export const isEmailConfigured = (): boolean => {
    return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
};

/**
 * Check if event update emails are configured (has separate template)
 */
export const isEventEmailConfigured = (): boolean => {
    return !!(EMAILJS_SERVICE_ID && EMAILJS_EVENT_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
};

/**
 * Send task assignment email to a member
 */
export const sendTaskAssignmentEmail = async (data: TaskEmailData): Promise<boolean> => {
    if (!isEmailConfigured()) {
        console.warn('EmailJS is not configured. Skipping email notification.');
        return false;
    }

    try {
        // Dynamic import to avoid loading emailjs if not needed
        const emailjs = await import('@emailjs/browser');

        const templateParams = {
            to_name: data.recipientName,
            to_email: data.recipientEmail,
            task_title: data.taskTitle,
            deadline: data.deadline ? formatDeadline(data.deadline) : 'No deadline set',
            event_title: data.eventTitle,
            assigned_by: data.assignedBy,
        };

        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log(`Email sent successfully to ${data.recipientEmail}`);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};

/**
 * Send task assignment emails to multiple members
 */
export const sendTaskAssignmentEmails = async (
    emails: string[],
    names: string[],
    taskTitle: string,
    deadline: string | undefined,
    eventTitle: string,
    assignedBy: string
): Promise<void> => {
    if (!isEmailConfigured()) {
        console.warn('EmailJS is not configured. Skipping email notifications.');
        return;
    }

    // Send emails in parallel
    const promises = emails.map((email, index) =>
        sendTaskAssignmentEmail({
            recipientEmail: email,
            recipientName: names[index] || 'Team Member',
            taskTitle,
            deadline,
            eventTitle,
            assignedBy,
        })
    );

    await Promise.allSettled(promises);
};

/**
 * Format deadline date for display in email
 */
const formatDeadline = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return dateString;
    }
};

/**
 * Send event update email to a single attendee
 * Uses the dedicated event update template (VITE_EMAILJS_EVENT_TEMPLATE_ID)
 */
export const sendEventUpdateEmail = async (
    recipientEmail: string,
    recipientName: string,
    eventTitle: string,
    updateMessage: string,
    clubName: string
): Promise<boolean> => {
    if (!isEventEmailConfigured()) {
        console.warn('Event email template is not configured. Skipping event update notification.');
        return false;
    }

    try {
        const emailjs = await import('@emailjs/browser');

        // Template variables for event update template
        const templateParams = {
            to_name: recipientName,
            to_email: recipientEmail,
            event_title: eventTitle,
            update_message: updateMessage,
            club_name: clubName,
        };

        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_EVENT_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log(`Event update email sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('Failed to send event update email:', error);
        return false;
    }
};

/**
 * Send event update emails to all RSVPed attendees
 */
export const sendEventUpdateEmails = async (
    attendees: Array<{ name: string; email: string }>,
    eventTitle: string,
    updateMessage: string,
    clubName: string
): Promise<void> => {
    if (!isEventEmailConfigured()) {
        console.warn('Event email template is not configured. Skipping event update notifications.');
        return;
    }

    const promises = attendees.map(attendee =>
        sendEventUpdateEmail(
            attendee.email,
            attendee.name,
            eventTitle,
            updateMessage,
            clubName
        )
    );

    await Promise.allSettled(promises);
    console.log(`Sent ${attendees.length} event update emails`);
};
