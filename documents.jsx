// Document templates — three demo docs rendered as HTML pages.

const DOC_TEMPLATES = {
  service_agreement: {
    name: "הסכם שירותי ייעוץ דיגיטלי",
    category: "הסכם",
    counterparty: "סטודיו לעיצוב מאיה ברק",
    pages: 2,
    render: (page) => page === 0 ? (
      <div className="page-content">
        <h1>הסכם שירותי ייעוץ דיגיטלי</h1>
        <div className="meta-line">תאריך עריכה: 14 במאי 2026 · מסמך מס' 2026-118</div>
        <div className="party-row">
          <div className="party-box">
            <div className="lbl">המזמין</div>
            <div className="val">או או טו סטראטעפס בע״מ</div>
            <div className="val" style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>ח.פ. 517268330</div>
          </div>
          <div className="party-box">
            <div className="lbl">הספק</div>
            <div className="val">סטודיו לעיצוב מאיה ברק</div>
            <div className="val" style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>ע.מ. 028471639</div>
          </div>
        </div>
        <h2>1. מהות ההתקשרות</h2>
        <p>הספק יעניק למזמין שירותי ייעוץ ועיצוב גרפי במסגרת פרויקט מיתוג חדש לרשת בתי הקפה של המזמין. השירות יכלול גיבוש שפה חזותית, עיצוב לוגו ראשי, ערכת אייקונים, מערכת צבעים, מערכת טיפוגרפיה, ושני סבבים של התאמות לפי בקשת המזמין.</p>
        <h2>2. תקופת ההתקשרות</h2>
        <p>ההסכם תקף מיום החתימה ועד למסירת התוצרים הסופיים, וזאת לא יאוחר מ-90 יום קלנדריים מיום החתימה. ניתן להאריך את תקופת ההתקשרות בכתב ובהסכמת שני הצדדים.</p>
        <h2>3. תמורה ולוח תשלומים</h2>
        <table>
          <thead>
            <tr><th>שלב</th><th>תיאור</th><th style={{ textAlign: 'left' }}>תמורה</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>מקדמה בעת חתימת ההסכם</td><td style={{ textAlign: 'left' }}>₪4,500</td></tr>
            <tr><td>2</td><td>מסירת דרפט ראשון ואישור כיוון</td><td style={{ textAlign: 'left' }}>₪3,500</td></tr>
            <tr><td>3</td><td>מסירת תוצרים סופיים</td><td style={{ textAlign: 'left' }}>₪4,000</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan="2">סה"כ (לא כולל מע"מ)</td><td style={{ textAlign: 'left' }}>₪12,000</td></tr>
          </tfoot>
        </table>
        <h2>4. קניין רוחני</h2>
        <p>זכויות הקניין הרוחני בתוצרים הסופיים יועברו במלואן למזמין עם השלמת התשלום האחרון. הספק שומר לעצמו את הזכות להציג את העבודה בתיק העבודות שלו.</p>
      </div>
    ) : (
      <div className="page-content">
        <h2>5. סודיות</h2>
        <p>שני הצדדים מתחייבים לשמור בסודיות מוחלטת כל מידע עסקי, רעיון, או חומר שיועבר ביניהם במסגרת ההתקשרות, בין אם המידע סומן כסודי ובין אם לאו, וזאת לתקופה של 36 חודשים ממועד סיום ההתקשרות.</p>
        <h2>6. ביטול ההסכם</h2>
        <p>כל אחד מהצדדים רשאי להפסיק את ההתקשרות בהודעה מוקדמת של 14 ימים בכתב. במקרה של הפסקה, יישא המזמין בעלות העבודה שבוצעה עד למועד ההפסקה, בכפוף לאישור היקף ביצוע על ידי שני הצדדים.</p>
        <h2>7. סמכות שיפוט</h2>
        <p>סמכות השיפוט הבלעדית בכל מחלוקת הנובעת מהסכם זה תהיה נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו. על ההסכם יחולו דיני מדינת ישראל בלבד.</p>
        <h2>8. כללי</h2>
        <ol>
          <li>הסכם זה מהווה את מלוא ההסכמות בין הצדדים ומבטל כל הסכם או הבנה קודמים, בעל פה או בכתב.</li>
          <li>כל שינוי בהסכם זה ייעשה בכתב ובחתימת שני הצדדים בלבד.</li>
          <li>אי-אכיפה של זכות כלשהי לפי הסכם זה לא תיחשב כוויתור עליה.</li>
        </ol>
        <p style={{ marginTop: 28 }}>ולראיה באו הצדדים על החתום:</p>
        <div className="signoff">
          <div className="signoff-block">
            <div className="lbl">המזמין</div>
            <div className="line">חתימה וחותמת</div>
          </div>
          <div className="signoff-block">
            <div className="lbl">הספק</div>
            <div className="line">חתימה</div>
          </div>
        </div>
      </div>
    )
  },

  price_quote: {
    name: "הצעת מחיר #2026-041",
    category: "הצעת מחיר",
    counterparty: "דניאל לוי - לקוח",
    pages: 1,
    render: () => (
      <div className="page-content">
        <h1>הצעת מחיר</h1>
        <div className="meta-line">מס' הצעה: 2026-041 · תוקף ההצעה: 30 ימים</div>
        <div className="party-row">
          <div className="party-box">
            <div className="lbl">מאת</div>
            <div className="val">או או טו סטראטעפס בע״מ</div>
          </div>
          <div className="party-box">
            <div className="lbl">לכבוד</div>
            <div className="val">דניאל לוי</div>
          </div>
        </div>
        <h2>פירוט השירות</h2>
        <p>הצעת מחיר עבור הקמת אתר תדמית כולל מערכת ניהול תוכן, אופטימיזציה למובייל, ואינטגרציה עם מערכת CRM קיימת.</p>
        <table>
          <thead>
            <tr><th>פריט</th><th style={{ textAlign: 'center' }}>כמות</th><th style={{ textAlign: 'left' }}>סכום</th></tr>
          </thead>
          <tbody>
            <tr><td>אפיון UX ומפת אתר</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪2,800</td></tr>
            <tr><td>עיצוב 6 עמודים</td><td style={{ textAlign: 'center' }}>6</td><td style={{ textAlign: 'left' }}>₪5,400</td></tr>
            <tr><td>פיתוח ואינטגרציה</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪7,800</td></tr>
            <tr><td>בדיקות והעלאה לאוויר</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪1,200</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan="2">סה"כ לפני מע"מ</td><td style={{ textAlign: 'left' }}>₪17,200</td></tr>
            <tr><td colSpan="2">מע"מ 17%</td><td style={{ textAlign: 'left' }}>₪2,924</td></tr>
            <tr><td colSpan="2" style={{ fontSize: 15 }}>סה"כ לתשלום</td><td style={{ textAlign: 'left', fontSize: 15 }}>₪20,124</td></tr>
          </tfoot>
        </table>
        <h2>תנאי תשלום</h2>
        <ol>
          <li>50% מקדמה במעמד חתימת ההצעה.</li>
          <li>50% עם העלאת האתר לאוויר.</li>
          <li>תשלום בהעברה בנקאית או בצ׳ק לפקודת או או טו סטראטעפס בע״מ.</li>
        </ol>
        <p style={{ marginTop: 18 }}>אישור ההצעה מהווה הסכמה לתנאים המפורטים לעיל ולתנאי השירות הכלליים שלנו.</p>
        <div className="signoff">
          <div className="signoff-block">
            <div className="lbl">חתימת הספק</div>
            <div className="line">או או טו סטראטעפס בע״מ</div>
          </div>
          <div className="signoff-block">
            <div className="lbl">אישור הלקוח</div>
            <div className="line">חתימה ותאריך</div>
          </div>
        </div>
      </div>
    )
  },

  nda: {
    name: "הסכם סודיות הדדי (NDA)",
    category: "NDA",
    counterparty: "Cloudwave Solutions",
    pages: 1,
    render: () => (
      <div className="page-content">
        <h1>הסכם סודיות הדדי</h1>
        <div className="meta-line">Non-Disclosure Agreement · גרסה 2.1</div>
        <div className="party-row">
          <div className="party-box"><div className="lbl">צד א'</div><div className="val">או או טו סטראטעפס בע״מ</div></div>
          <div className="party-box"><div className="lbl">צד ב'</div><div className="val">Cloudwave Solutions Ltd.</div></div>
        </div>
        <h2>1. הגדרת מידע סודי</h2>
        <p>"מידע סודי" משמעו כל מידע עסקי, טכנולוגי, כספי, שיווקי, או כל מידע אחר שיועבר בין הצדדים במסגרת בחינת שיתוף פעולה אפשרי, בין אם נמסר בכתב, בעל פה, או באופן אלקטרוני.</p>
        <h2>2. התחייבות לסודיות</h2>
        <p>שני הצדדים מתחייבים: (א) לשמור על המידע הסודי בסודיות מוחלטת; (ב) לא לעשות במידע הסודי כל שימוש שאינו לצורך בחינת שיתוף הפעולה; (ג) להגביל את הגישה למידע הסודי לעובדים ויועצים אשר חתמו על התחייבות סודיות דומה.</p>
        <h2>3. חריגים</h2>
        <p>החובות לפי הסכם זה לא יחולו על מידע אשר: (א) היה ידוע באופן ציבורי טרם מסירתו; (ב) הפך לידוע ציבורית שלא בעקבות הפרת הסכם זה; (ג) פותח באופן עצמאי על ידי הצד המקבל; (ד) נדרש לגילוי על פי דין או צו שיפוטי.</p>
        <h2>4. תקופה</h2>
        <p>התחייבויות הסודיות לפי הסכם זה יעמדו בתוקפן למשך 5 שנים מיום החתימה, גם אם לא יתממש שיתוף פעולה בין הצדדים.</p>
        <h2>5. סעדים</h2>
        <p>הצדדים מסכימים כי הפרת הסכם זה עלולה לגרום לנזק בלתי הפיך אשר לא ניתן יהיה לפצותו בכסף בלבד, ועל כן הצד הנפגע יהיה זכאי לסעדים מן היושר, לרבות צווי מניעה.</p>
        <div className="signoff">
          <div className="signoff-block"><div className="lbl">צד א'</div><div className="line">חתימה וחותמת</div></div>
          <div className="signoff-block"><div className="lbl">צד ב'</div><div className="line">חתימה</div></div>
        </div>
      </div>
    )
  }
};

window.DOC_TEMPLATES = DOC_TEMPLATES;
