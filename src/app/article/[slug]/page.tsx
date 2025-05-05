import styles from './articleDetail.module.css';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import article1 from '../../img/article1.png';
import article2 from '../../img/article2.png';
import article3 from '../../img/article3.png';
import Link from 'next/link';

// Mock data จาก database
const allArticles = [
  {
    title: 'คลังความรู้ 1',
    image: article1,
    category: 'คลังความรู้',
    content: `พหุนามคือสมการที่มีตัวแปรและสัมประสิทธิ์ต่าง ๆ ที่นำมารวมกันด้วยเครื่องหมายบวกหรือลบ
เป็นพื้นฐานสำคัญของพีชคณิตที่ใช้ในการแก้ปัญหาทางคณิตศาสตร์หลายแขนง เช่น เศรษฐศาสตร์ วิศวกรรม และวิทยาศาสตร์
ตัวอย่างของพหุนาม เช่น 3x² - 5x + 2 ที่มีดีกรีเป็น 2
การเข้าใจพหุนามสามารถช่วยให้เราวิเคราะห์กราฟ ฟังก์ชัน และแก้สมการที่ซับซ้อนได้อย่างมีประสิทธิภาพ`,
  },
  {
    title: 'โจทย์ความรู้ 1',
    image: article2,
    category: 'โจทย์ข้อสอบ',
    content: 'โจทย์และแนวทางการแก้ปัญหาทางสถิติ สำหรับฝึกฝนและเตรียมตัวสอบในระดับมัธยมและอุดมศึกษา',
  },
  {
    title: 'Check List 1',
    image: article3,
    category: 'Check List',
    content: 'บทความคลังความรู้ทั่วไป ที่จะช่วยเพิ่มพูนความเข้าใจในหลักการต่าง ๆ ของคณิตศาสตร์พื้นฐาน' ,
  },
  {
    title: 'ข่าว สอบ TCAS',
    image: article3,
    category: 'อื่น ๆ',
    content: 'บทความคลังความรู้ทั่วไป ที่จะช่วยเพิ่มพูนความเข้าใจในหลักการต่าง ๆ ของคณิตศาสตร์พื้นฐาน' ,
  },
];

export default function ArticleDetail({ params }: { params: { slug: string } }) {
  const decodedSlug = decodeURIComponent(params.slug);

  const article = allArticles.find((a) => {
    const slug = a.title.replace(/\s+/g, '-').toLowerCase();
    return slug === decodedSlug.toLowerCase();
  });

  if (!article) {
    return (
      <main>
        <Navbar />
        <div className={styles.container}>
          <h2>ไม่พบบทความ</h2>
          <p>Slug: {decodedSlug}</p>
          <Link href="/article">← กลับไปหน้ารวมบทความ</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.backLink}>
          <Link href="/article">← ย้อนกลับ</Link>
        </div>

        <h1 className={styles.title}>{article.title}</h1>
        <p className={styles.date}>14 กันยายน 2568</p>

        <div className={styles.contentSection}>
          <div className={styles.leftContent}>
            <Image src={article.image} alt={article.title} width={400} height={400} />
          
            <div className={styles.articleBody}>
              <p>{article.content}</p>
            </div>
          </div>
        </div>
        </div>
        <div className={styles.containerrelated}>
        <h2 className={styles.relatedHeader}>บทความอื่น ๆ</h2>
        <div className={styles.relatedGrid}>
          {allArticles.map((a, idx) => {
            const slug = encodeURIComponent(a.title.replace(/\s+/g, '-'));
            return (
              <Link href={`/article/${slug}`} key={idx} className={styles.relatedCard}>
                <Image src={a.image} alt={a.title} width={200} height={140} />
                <p>{a.title}</p>
                <span>{a.category}</span>
              </Link>
            );
          })}
        </div>
        </div>
      
      <Footer />
    </main>
  );
}
