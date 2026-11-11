import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  lang: Language;
  dir: 'rtl' | 'ltr';
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateCategory: (cat: string) => string;
  translateStatus: (status: string) => string;
  translateLevel: (lvl: string) => string;
  translateAudioStatus: (status: string) => string;
  translateDay: (day: string) => string;
  translateTime: (time: string) => string;
  translateMeter: (meter: string) => string;
  translateArticleType: (type: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    site_title: 'منصة أبي سعيد ابن بيضاء العلمية',
    subtitle: 'طالب علم وباحث في العلوم الشرعية واللغوية',
    home: 'الرئيسية',
    library: 'المكتبة والمؤلفات',
    audios: 'التسجيلات والشروح',
    poetry: 'الديوان والمنظومات',
    articles: 'خواطر ومقالات',
    schedule: 'الحلقات والجدول',
    contact: 'تواصل واستفتاء',
    admin: 'لوحة الإدارة',
    motto: '«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ»',
    motto_ref: 'سورة البقرة: ٢٠١',
    bismillah: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ',
    center_tag: 'مركز الإمام سيبويه • إلورن، نيجيريا',
    explore_library: 'تصفح المؤلفات والكتب',
    listen_audios: 'استمع للشروح الصوتية',
    read_poetry: 'طالع المنظومات والديوان',
    schedule_btn: 'مواعيد الحلقات الحضورية',
    ask_question: 'طرح سؤال أو استفتاء',
    all_categories: 'كافة الفنون والعلوم',
    all_levels: 'كافة المستويات',
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم / مفصل',
    printed: 'مطبوع',
    manuscript: 'مخطوط',
    filter_by_status: 'حالة النشر',
    all_statuses: 'الكل (مطبوع ومخطوط)',
    download_pdf: 'تحميل النسخة PDF',
    request_manuscript: 'طلب المخطوطة عبر واتساب',
    pages: 'صفحة',
    year: 'سنة التحرير',
    series: 'السلسلة',
    lesson_count: 'عدد الدروس',
    play_audio: 'استماع للشرح',
    pause_audio: 'إيقاف مؤقت',
    verses_count: 'بيتاً',
    sadr: 'الصدر',
    ajuz: 'العجز',
    font_size: 'حجم الخط',
    font_normal: 'عادي',
    font_large: 'كبير',
    font_grand: 'جليل',
    copy_verse: 'نسخ البيت',
    verse_copied: 'تم نسخ البيت!',
    read_full_article: 'قراءة كامل المقال / الخاطرة',
    back_to_articles: 'العودة لقائمة المقالات',
    back_to_poetry: 'العودة لقائمة المنظومات والديوان',
    share: 'مشاركة',
    ilorin_center: 'مركز الإمام سيبويه، شارع أولوجي، إلورن، نيجيريا',
    weekly_circles: 'الحلقات العلمية الأسبوعية الحضورية',
    distance_school: 'الأكاديمية العلمية الافتراضية',
    announcements: 'الإعلانات والدورات الحديثة',
    submit_question: 'إرسال السؤال للشيخ',
    your_name: 'اسم السائل / طالب العلم',
    your_question: 'نص السؤال أو الاستفتاء',
    select_science: 'اختر الفن العلمي',
    sent_successfully: 'تم إرسال سؤالك بنجاح!',
    no_human_imagery_notice: 'منصة أثرية ملتزمة بالضوابط الشرعية وخالية من صور ذوات الأرواح',
    admin_login: 'تسجيل دخول الإدارة',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    login_btn: 'دخول لوحة التحكم',
    logout_btn: 'تسجيل الخروج',
    save_changes: 'حفظ التعديلات',
    add_new: 'إضافة جديد',
    delete: 'حذف',
    edit: 'تعديل',
    cancel: 'إلغاء',
    search_placeholder: 'ابحث في المؤلفات، الشروح، المنظومات والخواطر...',
    featured_books_title: 'أبرز مؤلفات الشيخ أبي سعيد ابن بيضاء',
    featured_books_sub: 'من خزانة التحقيقات والمصنفات الشرعية واللغوية',
    view_all_books: 'عرض كافة المؤلفات',
    view_details: 'طالع التفاصيل',
    teaching_circle_box_title: 'مركز الإمام سيبويه، شارع أولوجي، إلورن',
    teaching_circle_box_sub: 'حلقات العلم الحضورية بإلورن',
    teaching_circle_box_desc: 'تعقد الحلقات العلمية الأسبوعية أيام الجمعة والسبت والأحد بعد صلاة العصر إلى قبيل المغرب في العقيدة، والحديث، والنحو والصرف.',
    teaching_circle_btn: 'جدول الحلقات بالتفصيل',
    poetry_box_title: 'المنظومات والديوان الشعري',
    poetry_box_sub: 'منظومات تعليمية',
    poetry_box_btn: 'الديوان كاملاً',
    reflections_box_title: 'إضاءات وتحريرات حديثة',
    reflections_box_sub: 'خواطر ابن بيضاء (٥٠٠+)',
    reflections_box_btn: 'كافة الخواطر',
    opening_verse: 'مطلع المنظومة',
    metrics_books_num: '+٣٥',
    metrics_books_label: 'مؤلفاً ورسالة علمية',
    metrics_books_desc: 'عبر ٧ علوم شرعية ولغوية',
    metrics_reflections_num: '+٥٠٠',
    metrics_reflections_label: 'خاطرة وبحث محرر',
    metrics_reflections_desc: 'سلسلة «خواطر ابن بيضاء»',
    metrics_poetry_num: '+٦٠٠',
    metrics_poetry_label: 'بيت في تعظيم العلم',
    metrics_poetry_desc: 'منظومات علمية وقصائد',
    metrics_audios_num: '+٤٠',
    metrics_audios_label: 'سلسلة صوتية كاملة',
    metrics_audios_desc: 'مبتدئ • متوسط • مفصل',
    library_header_title: 'المكتبة والمؤلفات العلمية',
    library_header_badge: 'خزانة التصانيف والتحقيقات الشرعية',
    library_header_desc: 'تضم مؤلفات وتحقيقات أبي سعيد مسعود بن محمود ابن بيضاء في العقيدة والسنة، الفقه وأصوله، الحديث، النحو والصرف، وعلوم اللسان العربي وآدابه.',
    filter_by_science: 'التصنيف حسب الفن العلمي (Al-Funūn):',
    showing_count: 'عرض',
    of_total: 'من أصل',
    books_unit: 'مصنفاً',
    treatise_details: 'تفاصيل المصنف',
    no_books_found: 'لا توجد مصنفات مطابقة للمعايير المحددة',
    no_books_found_desc: 'جرّب تغيير فئة الفن العلمي أو إزالة كلمات البحث.',
    close_modal: 'إغلاق',
    whatsapp_request: 'طلب نسخة أو استفسار عبر واتساب',
    audios_header_badge: 'السلاسل الصوتية والتسجيلات المنهجية',
    audios_header_title: 'الشروح الصوتية والمجالس العلمية',
    audios_header_desc: 'شروح متون العقيدة، النحو، الأدب، والحديث المسجلة في حلقات مركز الإمام سيبويه بإلورن والأكاديمية الافتراضية، مرتبة وفق مستويات التحصيل: مبتدئ، متوسط، ومفصل.',
    level_filter: 'المستوى التعليمي:',
    science_filter: 'الفن العلمي:',
    no_audios_found: 'لا توجد شروح صوتية مطابقة لبحثك',
    no_audios_found_desc: 'جرّب اختيار مستوى آخر أو مسح عبارة البحث.',
    recorded_lessons: 'دروس مسجلة',
    view_lessons: 'الدروس',
    hide_lessons: 'إخفاء الدروس',
    lessons_playlist: 'قائمة مجالس وسلاسل الشرح:',
    play_this_lesson: 'تشغيل هذا الدرس',
    poetry_header_badge: 'الديوان الشعري والمنظومات التعليمية الأثرية',
    poetry_header_title: 'المنظومات العلمية والقصائد الحكمية',
    poetry_header_desc: 'منظومات الشيخ أبي سعيد مسعود ابن بيضاء في أصول الشريعة، مناهج التحصيل، الحديث، الفقه، والرقائق، وفي طليعتها منظومة «تعظيم العلم» البالغة أكثر من ستمائة بيت على بحر الرجز، و«الدرة الثمينة في حلية طالب العلم».',
    poetry_search_placeholder: 'ابحث في عناوين المنظومات والأبحر الشعرية...',
    read_full_poem: 'قراءة المنظومة كاملة',
    poem_verses_total: 'بيتاً شعرياً',
    verse_word: 'البيت',
    search_verses_placeholder: 'ابحث في شطري البيت أو رقم البيت...',
    no_verses_found: 'لا توجد أبيات مطابقة لبحثك في هذه المنظومة.',
    poem_by_author: 'نظم أبي سعيد مسعود بن محمود ابن بيضاء حفظه الله',
    articles_header_badge: 'سلسلة خواطر ابن بيضاء والبحوث الأكاديمية',
    articles_header_title: 'خواطر ابن بيضاء والمقالات المحررة',
    articles_header_desc: 'أكثر من ٥٠٠ خاطرة محررة تضيء معالم طلب العلم، وتزكية النفوس، ونكات لغوية وحديثية، إلى جانب البحوث الأكاديمية والمقالات المنهجية.',
    article_type_filter: 'نوع المنشور:',
    all_articles: 'الكل',
    search_articles_placeholder: 'ابحث في الخواطر والمقالات بالكلمة أو الوسم...',
    read_full: 'قراءة كامل المقال / الخاطرة',
    copy_full_article: 'نسخ المقال كاملاً مع التوثيق',
    article_copied: 'تم نسخ نص المقال',
    written_by_attribution: 'كتبه أبو سعيد ابن بيضاء - حفظه الله ونفع به',
    schedule_header_badge: 'إلورن، نيجيريا • مركز الإمام سيبويه والأكاديمية الافتراضية',
    schedule_header_title: 'جدول الدروس والحلقات العلمية',
    schedule_header_desc: 'مواعيد الحلقات الحضورية الدورية الأسبوعية بمسجد ومركز الإمام سيبويه بشارع أولوجي في مدينة إلورن، إلى جانب مناشط الأكاديمية الافتراضية الموجهة لطلاب العلم عبر الآفاق.',
    in_person_and_stream: 'حضوري وبث مباشر',
    day_word: 'يوم',
    virtual_academy_badge: 'التعليم الشرعي عن بعد',
    telegram_channel_btn: 'قناة التيليجرام الرسمية',
    whatsapp_group_btn: 'مجموعة التوجيه عبر واتساب',
    new_course_badge: 'دورة جديدة',
    audio_announcement_badge: 'إعلان صوتي',
    question_box_badge: 'استفتاءات ومذاكرة',
    question_box_title: 'صندوق أسئلة واستفتاءات طلبة العلم',
    question_box_desc: 'وجّه سؤالك في العقيدة، الفقه، الحديث، أو النحو ليجيب عنه الشيخ أبو سعيد ابن بيضاء في مجالس الإفتاء والحلقات الأسبوعية.',
    student_name_placeholder: 'أبو عبد الله / طالب علم...',
    question_text_placeholder: 'اكتب استفسارك أو مسألتك العلمية بوضوح وإيجاز...',
    submitting: 'جاري الإرسال...',
    send_direct_whatsapp: 'إرسال مباشر عبر واتساب',
    sent_success_note: 'سيتم النظر فيه وعرضه على الشيخ.',
    faq_title: 'نماذج من الأسئلة والأجوبة السابقة',
    search_questions_placeholder: 'ابحث في فتاوى وأسئلة الطلاب...',
    inquirer: 'السائل',
    shaykh_answer: 'جواب الشيخ أبي سعيد ابن بيضاء:',
    under_review: 'السؤال قيد العرض والمراجعة في مجلس الإفتاء القادم.',
    search_modal_placeholder: 'ابحث في تراث الشيخ: كتب، شروح، أبيات، أو خواطر...',
    search_empty_hint: 'اكتب كلمة للبحث السريع في المصنفات، الشروح الصوتية، المنظومات، أو الخواطر.',
    search_no_results: 'لم نعثر على نتائج مطابقة لـ',
    search_books_section: 'المؤلفات والكتب',
    search_audios_section: 'الشروح الصوتية',
    search_poetry_section: 'المنظومات والديوان',
    search_articles_section: 'الخواطر والمقالات',
    clear_btn: 'مسح',
    footer_desc: 'منصة علمية شرعية ولغوية أثرية تعنى بنشر مؤلفات وتحقيقات وشروحات الشيخ أبي سعيد ابن بيضاء، وتيسير سبل التحصيل لطلبة العلم وفق منهج السلف الصالح.',
    footer_sections: 'أقسام المنصة',
    footer_contact: 'المقر وقنوات التواصل',
    footer_rights: 'جميع الحقوق محفوظة لمنصة الشيخ أبي سعيد ابن بيضاء العلمية ©',
    footer_service: 'خدمة للعلم الشرعي واللسان العربي',
  },
  en: {
    site_title: 'Abu Sa\'eed Ibn Baydoah Platform',
    subtitle: 'Student of Knowledge & Researcher in Shari\'ah & Arabic Linguistics',
    home: 'Home',
    library: 'Library & Works',
    audios: 'Audio Lectures',
    poetry: 'Poetry & Diwan',
    articles: 'Reflections & Papers',
    schedule: 'Schedule & Halaqat',
    contact: 'Contact & Inquiries',
    admin: 'Admin Portal',
    motto: '"Our Lord, give us in this world that which is good and in the Hereafter that which is good and protect us from the punishment of the Fire."',
    motto_ref: 'Surah Al-Baqarah: 201',
    bismillah: 'In the Name of Allah, the Most Gracious, the Most Merciful',
    center_tag: 'Markaz Al-Imām Sībawayh • Ilorin, Nigeria',
    explore_library: 'Explore Books & Treatises',
    listen_audios: 'Listen to Audio Courses',
    read_poetry: 'Read Didactic Poems',
    schedule_btn: 'In-Person Halaqat Schedule',
    ask_question: 'Ask a Question / Inquire',
    all_categories: 'All Scientific Disciplines',
    all_levels: 'All Learning Levels',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced / In-depth',
    printed: 'Published Print',
    manuscript: 'Manuscript (In prep)',
    filter_by_status: 'Publication Status',
    all_statuses: 'All (Printed & Manuscripts)',
    download_pdf: 'Download PDF',
    request_manuscript: 'Request Manuscript via WhatsApp',
    pages: 'Pages',
    year: 'Year of Writing',
    series: 'Series',
    lesson_count: 'Lessons',
    play_audio: 'Listen to Lecture',
    pause_audio: 'Pause Audio',
    verses_count: 'Verses',
    sadr: 'First Hemistich (Al-Ṣadr)',
    ajuz: 'Second Hemistich (Al-‘Ajuz)',
    font_size: 'Font Size',
    font_normal: 'Normal',
    font_large: 'Large',
    font_grand: 'Grand',
    copy_verse: 'Copy Verse',
    verse_copied: 'Verse Copied!',
    read_full_article: 'Read Full Reflection / Paper',
    back_to_articles: 'Back to Articles List',
    back_to_poetry: 'Back to Poems & Diwan',
    share: 'Share',
    ilorin_center: 'Markaz Al-Imām Sībawayh, Oloje Road, Ilorin, Nigeria',
    weekly_circles: 'Weekly In-Person Teaching Circles',
    distance_school: 'Virtual Distance Learning Academy',
    announcements: 'Announcements & Recent Seminars',
    submit_question: 'Submit Question to the Ustādh',
    your_name: 'Your Name / Student Name',
    your_question: 'Your Question or Scholarly Inquiry',
    select_science: 'Select Classical Science',
    sent_successfully: 'Your question was sent successfully!',
    no_human_imagery_notice: 'A classical scholarly platform adhering to Islamic principles without human/animal imagery',
    admin_login: 'Admin Sign In',
    username: 'Username',
    password: 'Password',
    login_btn: 'Sign In to Control Panel',
    logout_btn: 'Sign Out',
    save_changes: 'Save Changes',
    add_new: 'Add New',
    delete: 'Delete',
    edit: 'Edit',
    cancel: 'Cancel',
    search_placeholder: 'Search books, lectures, poems, and reflections...',
    featured_books_title: 'Prominent Works of Ustādh Abu Sa\'eed Ibn Baydoah',
    featured_books_sub: 'From His Library of Shari\'ah & Linguistic Research and Treatises',
    view_all_books: 'View All Treatises',
    view_details: 'View Details',
    teaching_circle_box_title: 'Markaz Al-Imām Sībawayh, Oloje Road, Ilorin',
    teaching_circle_box_sub: 'In-Person Study Circles in Ilorin',
    teaching_circle_box_desc: 'Weekly teaching circles take place every Friday, Saturday, and Sunday after \'Asr prayer until before Maghrib in Aqeedah, Hadith, and Arabic Grammar & Morphology.',
    teaching_circle_btn: 'View Detailed Circle Timetable',
    poetry_box_title: 'Poetry & Classical Diwan',
    poetry_box_sub: 'Didactic Pedagogical Poems',
    poetry_box_btn: 'Browse Entire Diwan',
    reflections_box_title: 'Recent Scholarly Insights & Papers',
    reflections_box_sub: 'Khawātir Ibn Baydoah (500+ Series)',
    reflections_box_btn: 'Browse All Reflections',
    opening_verse: 'Opening Verse',
    metrics_books_num: '+35',
    metrics_books_label: 'Authored Books & Treatises',
    metrics_books_desc: 'Across 7 Classical Sciences',
    metrics_reflections_num: '+500',
    metrics_reflections_label: 'Reflections & Academic Papers',
    metrics_reflections_desc: 'Series \'Khawātir Ibn Baydoah\'',
    metrics_poetry_num: '+600',
    metrics_poetry_label: 'Verses on Ta‘ẓīm al-‘Ilm',
    metrics_poetry_desc: 'Didactic Poems & Diwan',
    metrics_audios_num: '+40',
    metrics_audios_label: 'Complete Audio Course Series',
    metrics_audios_desc: 'Beginner • Intermediate • Advanced',
    library_header_title: 'Scholarly Library & Authored Works',
    library_header_badge: 'Treasury of Treatises & Textual Research',
    library_header_desc: 'Comprising authored treatises and textual commentaries by Abu Sa\'eed Mas\'uud bn Mahmood Ibn Baydoah across Creed & Sunnah, Jurisprudence & Principles, Hadith, Grammar & Morphology, and Arabic Rhetoric.',
    filter_by_science: 'Filter by Classical Science (Al-Funūn):',
    showing_count: 'Showing',
    of_total: 'of',
    books_unit: 'treatises',
    treatise_details: 'Treatise Details',
    no_books_found: 'No treatises match the selected criteria',
    no_books_found_desc: 'Try choosing another scientific discipline or clearing the search terms.',
    close_modal: 'Close',
    whatsapp_request: 'Request Manuscript via WhatsApp',
    audios_header_badge: 'Audio Course Series & Regular Sessions',
    audios_header_title: 'Audio Lectures & Recorded Circles',
    audios_header_desc: 'Detailed commentaries on classical primers in Creed, Arabic Grammar, Literature, and Hadith recorded at Markaz Al-Imām Sībawayh in Ilorin and the Virtual Academy, structured by learning level: Beginner, Intermediate, and Advanced.',
    level_filter: 'Learning Level:',
    science_filter: 'Classical Science:',
    no_audios_found: 'No audio series found matching your query',
    no_audios_found_desc: 'Try selecting a different level or clearing the search keyword.',
    recorded_lessons: 'Recorded Lessons',
    view_lessons: 'Lessons',
    hide_lessons: 'Hide Lessons',
    lessons_playlist: 'Course Lessons Playlist:',
    play_this_lesson: 'Play this lesson',
    poetry_header_badge: 'Classical Diwan & Didactic Poems',
    poetry_header_title: 'Scholarly Didactic Poems & Classical Verses',
    poetry_header_desc: 'Pedagogical didactic poems (Manẓūmāt) by Ustādh Abu Sa\'eed Ibn Baydoah on Shari\'ah foundations, student manners, Hadith, Fiqh, and spiritual heart softeners, led by his monumental 612-verse poem on \'Venerating Sacred Knowledge\' (Ta‘ẓīm al-‘Ilm) on the Rajaz meter.',
    poetry_search_placeholder: 'Search poems by title or meter...',
    read_full_poem: 'Read Full Poem with Hemistich Layout',
    poem_verses_total: 'Poetic Verses',
    verse_word: 'Verse',
    search_verses_placeholder: 'Search in either hemistich or by verse number...',
    no_verses_found: 'No verses match your search in this poem.',
    poem_by_author: 'Composed by Ustādh Abu Sa\'eed Mas\'uud bn Mahmood Ibn Baydoah',
    articles_header_badge: 'Khawātir Ibn Baydoah & Academic Papers',
    articles_header_title: 'Daily Reflections & Academic Research',
    articles_header_desc: 'Over 500 edited reflections elucidating pathways of acquiring sacred knowledge, spiritual rectification, grammatical gems, and Hadith benefits, alongside peer research papers.',
    article_type_filter: 'Publication Type:',
    all_articles: 'All Entries',
    search_articles_placeholder: 'Search reflections and papers by keyword or tag...',
    read_full: 'Read Full Paper / Reflection',
    copy_full_article: 'Copy Full Paper with Attribution',
    article_copied: 'Text Copied to Clipboard',
    written_by_attribution: 'Written by Abu Sa\'eed Ibn Baydoah',
    schedule_header_badge: 'Ilorin, Nigeria • Markaz Al-Imām Sībawayh & Virtual Academy',
    schedule_header_title: 'Lecture Timetable & Study Circles',
    schedule_header_desc: 'Weekly teaching timetable at Markaz Al-Imām Sībawayh Mosque on Oloje Road in Ilorin, alongside online distance-learning programs for students worldwide.',
    in_person_and_stream: 'In-Person & Live Broadcast',
    day_word: 'Day',
    virtual_academy_badge: 'Distance Islamic Learning',
    telegram_channel_btn: 'Official Telegram Channel',
    whatsapp_group_btn: 'Guidance WhatsApp Group',
    new_course_badge: 'New Intensive Course',
    audio_announcement_badge: 'Audio Release',
    question_box_badge: 'Inquiries & Discussions',
    question_box_title: 'Students’ Question & Inquiry Box',
    question_box_desc: 'Submit your inquiries on Creed, Fiqh, Hadith, or Arabic Grammar for Ustādh Abu Sa\'eed Ibn Baydoah to address during his weekly circles and Q&A sessions.',
    student_name_placeholder: 'Your name / Student of Knowledge...',
    question_text_placeholder: 'Write your question or scholarly inquiry clearly and concisely...',
    submitting: 'Submitting...',
    send_direct_whatsapp: 'Send Directly via WhatsApp',
    sent_success_note: 'It will be reviewed and presented to the Ustādh.',
    faq_title: 'Selected Previous Questions & Answers',
    search_questions_placeholder: 'Search through answered questions...',
    inquirer: 'Inquirer',
    shaykh_answer: 'Answer by Ustādh Abu Sa\'eed Ibn Baydoah:',
    under_review: 'This question is currently scheduled for the upcoming inquiry council.',
    search_modal_placeholder: 'Search across treatises, audio courses, verses, or reflections...',
    search_empty_hint: 'Type a word to quickly search through books, audio lectures, poems, and reflections.',
    search_no_results: 'No matching results found for',
    search_books_section: 'Books & Treatises',
    search_audios_section: 'Audio Lectures',
    search_poetry_section: 'Poems & Diwan',
    search_articles_section: 'Reflections & Papers',
    clear_btn: 'Clear',
    footer_desc: 'An authentic Islamic scholarly platform dedicated to publishing the books, research, and audio commentaries of Ustādh Abu Sa\'eed Ibn Baydoah, facilitating sacred knowledge according to the methodology of the Salaf.',
    footer_sections: 'Platform Sections',
    footer_contact: 'Location & Official Channels',
    footer_rights: 'All rights reserved for Abu Sa\'eed Ibn Baydoah Platform ©',
    footer_service: 'In service of Sacred Knowledge and the Arabic Language',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('ar');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
  }, [lang, dir]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const setLanguage = (newLang: Language) => {
    setLang(newLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[lang][key] || fallback || key;
  };

  const translateCategory = (cat: string): string => {
    if (lang === 'ar') return cat;
    switch (cat) {
      case 'العقيدة والتوحيد':
        return 'Creed & Tawheed';
      case 'الفقه وأصوله':
        return 'Fiqh & Principles (Jurisprudence)';
      case 'الحديث وعلومه':
        return 'Hadith & its Sciences';
      case 'التفسير وعلوم القرآن':
      case 'التفسير':
        return 'Tafsir & Quranic Sciences';
      case 'النحو والصرف':
        return 'Grammar & Morphology';
      case 'الأدب والبلاغة واللغة':
      case 'الأدب واللغة':
      case 'علوم اللغة':
      case 'البلاغة':
        return 'Literature, Rhetoric & Arabic Language';
      case 'الأدب والأخلاق':
        return 'Etiquette & Adab';
      case 'مناهج الطلب والتحصيل':
        return 'Methodology of Seeking Knowledge';
      case 'الرقائق والأخلاق':
        return 'Heart Softeners & Ethics';
      case 'مراثي وفضائل':
        return 'Elegies & Virtues';
      case 'الأصول والمنهج':
        return 'Foundations & Methodology';
      default:
        return cat;
    }
  };

  const translateStatus = (status: string): string => {
    if (lang === 'ar') return status;
    return status === 'مطبوع' ? 'Published Print' : 'Manuscript (In prep)';
  };

  const translateLevel = (lvl: string): string => {
    if (lang === 'ar') return lvl;
    if (lvl.includes('مبتدئ') || lvl.toLowerCase() === 'beginner') return 'Beginner';
    if (lvl.includes('متوسط') || lvl.toLowerCase() === 'intermediate') return 'Intermediate';
    if (lvl.includes('متقدم') || lvl.toLowerCase() === 'advanced') return 'Advanced / In-depth';
    return lvl;
  };

  const translateAudioStatus = (status: string): string => {
    if (lang === 'ar') return status;
    return status === 'مكتمل' ? 'Completed Course' : 'Ongoing Weekly Circle';
  };

  const translateDay = (day: string): string => {
    if (lang === 'ar') return day;
    switch (day) {
      case 'الجمعة':
        return 'Friday';
      case 'السبت':
        return 'Saturday';
      case 'الأحد':
        return 'Sunday';
      case 'الإثنين':
        return 'Monday';
      case 'الثلاثاء':
        return 'Tuesday';
      case 'الأربعاء':
        return 'Wednesday';
      case 'الخميس':
        return 'Thursday';
      default:
        return day;
    }
  };

  const translateTime = (time: string): string => {
    if (lang === 'ar') return time;
    if (time.includes('بعد صلاة العصر إلى قبيل المغرب') || time.includes('بعد العصر إلى قبيل المغرب')) {
      return 'After \'Asr prayer until before Maghrib';
    }
    return time;
  };

  const translateMeter = (meter: string): string => {
    if (lang === 'ar') return meter;
    switch (meter) {
      case 'بحر الرجز':
        return 'Rajaz Meter';
      case 'بحر الرمل':
        return 'Ramal Meter';
      case 'بحر البسيط':
        return 'Basit Meter';
      case 'بحر الطويل':
        return 'Tawil Meter';
      case 'بحر الكامل':
        return 'Kamil Meter';
      default:
        return meter;
    }
  };

  const translateArticleType = (type: string): string => {
    if (lang === 'ar') return type;
    switch (type) {
      case 'خواطر ابن بيضاء':
        return 'Khawātir Ibn Baydoah (Daily Reflection)';
      case 'بحث أكاديمي':
        return 'Academic Research Paper';
      case 'مقال عقدي':
        return 'Theological Article';
      case 'مقال لغوي':
        return 'Linguistic Paper';
      default:
        return type;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir,
        toggleLanguage,
        setLanguage,
        t,
        translateCategory,
        translateStatus,
        translateLevel,
        translateAudioStatus,
        translateDay,
        translateTime,
        translateMeter,
        translateArticleType
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
