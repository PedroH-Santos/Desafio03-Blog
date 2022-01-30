import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AiOutlineCalendar } from 'react-icons/ai';
import { FiUser } from 'react-icons/fi';
import { BiTimeFive } from 'react-icons/bi';
import { RichText } from 'prismic-dom';
import Comments from '../../components/Comments';
import Link from 'next/link';
interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean,
  navigation: {
    prevPost: {
      uid: string,
      data: {
        title: string,
      }
    }[],
    nextPost: {
      uid: string,
      data: {
        title: string,
      }
    }[],
  }
}

export default function Post({ post, preview, navigation }: PostProps) {
  //   // TODO

  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const formatterDatePublication = format(new Date(post.first_publication_date), 'dd MMM yyyy', { locale: ptBR, });
  const totalTimeForLoad = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;
    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalTimeForLoad / 200);

const hadEditPost = post.first_publication_date !== post.last_publication_date;
let editDate;
if(hadEditPost) {
  editDate =  format(new Date(post.last_publication_date), "'* editado em' dd MMM yyyy', às' H':'m", { locale: ptBR, });
}

  return (
    <>
      <Head>
        <title> {`${post.data.title} | spacetraveling`} </title>
      </Head>
      <main className={styles.container}>
        <img src={post.data.banner.url} className={styles.banner} />
        <section>
          <div className={styles.contentTop}>
            <h1> {post.data.title} </h1>
            <div className={styles.info}>
              <time> <AiOutlineCalendar /> {formatterDatePublication} </time>
              <p> <FiUser /> {post.data.author}</p>
              <time> <BiTimeFive /> {readTime} min </time>
            </div>
            <span>{hadEditPost && editDate}</span>
          </div>
          <div className={styles.contentBody}>
            {post.data.content.map(content => {
              return (
                <article key={content.heading}>
                  <h2> {content.heading} </h2>
                  <div dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}>
                  </div>
                </article>
              )
            })}
          </div>
          <section className={styles.sectionNavigation}>
            {navigation?.prevPost?.length > 0 && (
              <div>
                <h3> {navigation.prevPost[0].data.title} </h3>
                <Link href={navigation.prevPost[0].uid}>
                  <a> Post Anterior</a>
                </Link>
              </div>
            )}
            {navigation?.nextPost?.length > 0 && (
              <div>
                <h3> {navigation.nextPost[0].data.title} </h3>
                <Link href={navigation.nextPost[0].uid}>
                  <a> Próximo Post </a>
                </Link>
              </div>
            )}
          </section>

          <Comments />

          {preview && (
            <aside>
              <Link href='/api/exit-preview'>
                <a className={styles.buttonPreview}> Sair do modo Preview </a>
              </Link>
            </aside>
          )}

        </section>

      </main>
    </>
  );

}


export const getStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map((post) => {
    return {
      params: {
        slug: post.uid
      }
    }
  });
  return {
    paths,
    fallback: true
  }
};

export const getStaticProps: GetStaticProps = async ({ params, preview = false, previewData }) => {
  const prismic = getPrismicClient();

  let { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });


  const lastPublication = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date desc]',
  });

  const nextPublication = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date ]',
  });
  const publication = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map((content) => {
        return {
          heading: content.heading,
          body: [...content.body],
        }
      })

    }

  }

  return {
    props: {
      post: publication,
      navigation: {
        prevPost: lastPublication?.results,
        nextPost: nextPublication?.results,
      },
      preview: preview
    }
  }
};
